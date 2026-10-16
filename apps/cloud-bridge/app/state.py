import json
import os
import copy
import logging
from typing import Dict, Any, Optional, List
from .websocket_manager import ws_manager

logger = logging.getLogger("WorldStateManager")

class WorldStateManager:
    def __init__(self, data_file: Optional[str] = None):
        if not data_file:
            data_file = os.path.join(os.path.dirname(__file__), "data", "default_world.json")
        self.data_file = data_file
        self.pristine_file = os.path.join(os.path.dirname(__file__), "data", "default_world.pristine.json")
        self.state: Dict[str, Any] = {}
        self.load_initial_state()

    def load_initial_state(self):
        target = self.data_file
        if not os.path.exists(target) or os.path.getsize(target) < 100:
            target = self.pristine_file
        with open(target, "r", encoding="utf-8") as f:
            self.state = json.load(f)
        if not self.state.get("entities") and os.path.exists(self.pristine_file):
            with open(self.pristine_file, "r", encoding="utf-8") as pf:
                self.state = json.load(pf)
        logger.info(f"Loaded world state with {len(self.state.get('entities', []))} entities.")

    def reset_to_default(self):
        self.load_initial_state()

    def save_as_default(self) -> bool:
        if not self.state.get("entities"):
            logger.warning("Refusing to overwrite default_world.json with empty entities!")
            return False
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved current world layout ({len(self.state.get('entities', []))} entities) as default_world.json.")
        return True

    def clear_all_entities(self):
        self.state["entities"] = []
        self.state["data_streams"] = []

    def get_world(self) -> Dict[str, Any]:
        return copy.deepcopy(self.state)

    def get_layout(self) -> Dict[str, Any]:
        entities = self.state.get("entities", [])
        occupied_cells = []
        for ent in entities:
            pos = ent.get("grid_position", {"x": 0, "y": 0})
            fp = ent.get("footprint", {"w": 1, "h": 1})
            for dx in range(fp.get("w", 1)):
                for dy in range(fp.get("h", 1)):
                    occupied_cells.append({
                        "x": pos["x"] + dx,
                        "y": pos["y"] + dy,
                        "entity_id": ent["id"]
                    })

        return {
            "meta": self.state.get("meta", {}),
            "total_entities": len(entities),
            "occupied_cells": occupied_cells,
            "entities": entities,
            "data_streams": self.state.get("data_streams", [])
        }

    def find_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        for ent in self.state.get("entities", []):
            if ent["id"] == entity_id:
                return ent
        return None

    async def place_object(
        self,
        id: str,
        asset_type: str,
        grid_x: int,
        grid_y: int,
        footprint_w: int = 1,
        footprint_h: int = 1,
        entity_type: str = "station",
        name: Optional[str] = None,
        rules_group_id: Optional[str] = None,
        world_x: Optional[float] = None,
        world_y: Optional[float] = None,
        flip_x: bool = False
    ) -> Dict[str, Any]:
        existing = self.find_entity(id)
        if existing:
            await self.remove_object(id)

        custom_data: Dict[str, Any] = {"flip_x": flip_x}
        if world_x is not None and world_y is not None:
            custom_data["world_x"] = round(world_x, 1)
            custom_data["world_y"] = round(world_y, 1)

        new_entity = {
            "id": id,
            "name": name or id.replace("_", " ").title(),
            "type": entity_type,
            "asset_type": asset_type,
            "grid_position": {"x": max(0, int(grid_x)), "y": max(0, int(grid_y))},
            "footprint": {"w": footprint_w, "h": footprint_h},
            "state": {
                "status": "idle",
                "current_session_seconds_left": 0,
                "total_session_seconds": 0,
                "stamina": 100,
                "wait_duration_seconds": 0,
                "custom_data": custom_data
            },
            "rules_group_id": rules_group_id
        }

        self.state.setdefault("entities", []).append(new_entity)

        await ws_manager.broadcast({
            "type": "ENTITY_PLACED",
            "payload": new_entity
        })
        return new_entity

    async def remove_object(self, id: str) -> bool:
        entities = self.state.get("entities", [])
        orig_len = len(entities)
        self.state["entities"] = [e for e in entities if e["id"] != id]

        self.state["data_streams"] = [
            s for s in self.state.get("data_streams", []) if s.get("entity_id") != id
        ]

        if len(self.state["entities"]) < orig_len:
            await ws_manager.broadcast({
                "type": "ENTITY_REMOVED",
                "payload": {"id": id}
            })
            return True
        return False

    async def update_entity_state(self, id: str, state_patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        ent = self.find_entity(id)
        if not ent:
            return None

        state = ent.setdefault("state", {})
        if "custom_data" in state_patch and isinstance(state_patch["custom_data"], dict):
            existing_cd = state.setdefault("custom_data", {})
            existing_cd.update(state_patch["custom_data"])
            patch_copy = {k: v for k, v in state_patch.items() if k != "custom_data"}
            state.update(patch_copy)
        else:
            state.update(state_patch)

        if "grid_x" in state_patch and "grid_y" in state_patch:
            ent["grid_position"] = {
                "x": max(0, int(state_patch["grid_x"])),
                "y": max(0, int(state_patch["grid_y"]))
            }

        await ws_manager.broadcast({
            "type": "ENTITY_UPDATED",
            "payload": {
                "id": id,
                "state": ent["state"]
            }
        })
        return ent

    async def bind_data_stream(
        self,
        entity_id: str,
        source_type: str,
        source_locator: str,
        visual_trigger: str = "light_glow"
    ) -> Dict[str, Any]:
        streams = self.state.setdefault("data_streams", [])
        binding_id = f"stream_{source_type}_{entity_id}"

        for s in streams:
            if s.get("entity_id") == entity_id and s.get("source_type") == source_type:
                s["source_locator"] = source_locator
                s["visual_trigger"] = visual_trigger
                return s

        new_binding = {
            "id": binding_id,
            "entity_id": entity_id,
            "source_type": source_type,
            "source_locator": source_locator,
            "visual_trigger": visual_trigger
        }
        streams.append(new_binding)
        return new_binding

    async def configure_business_rules(self, rules_group_id: str, rule_overrides: Dict[str, Any]) -> Dict[str, Any]:
        groups = self.state.setdefault("rules_groups", [])
        for g in groups:
            if g.get("rules_group_id") == rules_group_id:
                g.update(rule_overrides)
                return g

        new_group = {
            "rules_group_id": rules_group_id,
            **rule_overrides
        }
        groups.append(new_group)
        return new_group

world_state = WorldStateManager()

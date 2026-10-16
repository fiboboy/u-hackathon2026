import logging
from typing import Dict, Any, List, Optional
from .websocket_manager import ws_manager

logger = logging.getLogger("RulesEngine")

class DynamicRulesEngine:
    def __init__(self):
        # Cache of already triggered actions to avoid re-triggering every single tick
        self.triggered_actions: Dict[str, set] = {}

    def reset_triggers(self, entity_id: Optional[str] = None):
        if entity_id:
            self.triggered_actions.pop(entity_id, None)
        else:
            self.triggered_actions.clear()

    async def evaluate_entity_rules(self, entity: Dict[str, Any], world_rules: List[Dict[str, Any]]):
        rules_group_id = entity.get("rules_group_id")
        if not rules_group_id:
            return

        matching_groups = [g for g in world_rules if g.get("rules_group_id") == rules_group_id]
        if not matching_groups:
            return

        ent_id = entity["id"]
        ent_state = entity.get("state", {})
        if ent_id not in self.triggered_actions:
            self.triggered_actions[ent_id] = set()

        for group in matching_groups:
            metric_name = group.get("metric_tracked")
            metric_val = ent_state.get(metric_name, 0)

            for threshold in group.get("thresholds", []):
                operator = threshold.get("operator", ">=")
                thresh_val = threshold.get("value", 0)
                state_label = threshold.get("state_label", "triggered")

                triggered = False
                if operator == ">=" and metric_val >= thresh_val:
                    triggered = True
                elif operator == ">" and metric_val > thresh_val:
                    triggered = True
                elif operator == "<=" and metric_val <= thresh_val:
                    triggered = True
                elif operator == "<" and metric_val < thresh_val:
                    triggered = True
                elif operator == "==" and metric_val == thresh_val:
                    triggered = True

                action_key = f"{rules_group_id}_{state_label}_{thresh_val}"
                if triggered:
                    if action_key not in self.triggered_actions[ent_id]:
                        self.triggered_actions[ent_id].add(action_key)
                        logger.info(f"Rule triggered for {ent_id}: {state_label} (metric: {metric_val} {operator} {thresh_val})")
                        await self.execute_actions(ent_id, threshold.get("actions", []))
                else:
                    # Reset action key if metric falls back below threshold
                    self.triggered_actions[ent_id].discard(action_key)

    async def execute_actions(self, entity_id: str, actions: List[Dict[str, Any]]):
        for action in actions:
            act_type = action.get("type")
            if act_type == "emit_particles":
                await ws_manager.broadcast({
                    "type": "TRIGGER_EFFECT",
                    "payload": {
                        "entity_id": entity_id,
                        "effect": action.get("emitter_id", "irritation_smoke"),
                        "intensity": 1.0,
                        "duration_ms": action.get("duration_ms", 5000)
                    }
                })
            elif act_type == "apply_shader":
                await ws_manager.broadcast({
                    "type": "TRIGGER_EFFECT",
                    "payload": {
                        "entity_id": entity_id,
                        "effect": "light_glow",
                        "intensity": 1.0
                    }
                })
            elif act_type == "show_bubble":
                icon = action.get("icon", "tea_cup")
                effect_name = "tea_bubble" if "tea" in icon else "coffee_bubble"
                await ws_manager.broadcast({
                    "type": "TRIGGER_EFFECT",
                    "payload": {
                        "entity_id": entity_id,
                        "effect": effect_name,
                        "intensity": 1.0
                    }
                })

rules_engine = DynamicRulesEngine()

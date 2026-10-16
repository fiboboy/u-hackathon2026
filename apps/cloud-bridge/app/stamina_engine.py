import asyncio
import time
import logging
from typing import Dict, Any
from .state import world_state
from .rules_engine import rules_engine
from .websocket_manager import ws_manager

logger = logging.getLogger("StaminaEngine")

class StaminaEngine:
    def __init__(self, tick_interval_sec: float = 1.0):
        self.tick_interval_sec = tick_interval_sec
        self.running = False
        self.task: asyncio.Task = None
        self.last_tick_time = time.time()

    def start(self):
        if not self.running:
            self.running = True
            self.last_tick_time = time.time()
            self.task = asyncio.create_task(self._run_loop())
            logger.info("StaminaEngine background worker started.")

    def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            logger.info("StaminaEngine background worker stopped.")

    async def _run_loop(self):
        while self.running:
            try:
                await asyncio.sleep(self.tick_interval_sec)
                await self.tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in StaminaEngine tick loop: {e}", exc_info=True)

    async def tick(self):
        now = time.time()
        delta_sec = now - self.last_tick_time
        delta_min = delta_sec / 60.0
        self.last_tick_time = now

        entities = world_state.state.get("entities", [])
        rules_groups = world_state.state.get("rules_groups", [])
        updates = []

        for ent in entities:
            ent_type = ent.get("type")
            ent_state = ent.setdefault("state", {})
            ent_id = ent.get("id")
            updated = False

            # 1. Staff Stamina update
            if ent_type == "staff":
                status = ent_state.get("status", "idle")
                current_stamina = float(ent_state.get("stamina", 100.0))
                # Thai massage default: drain 0.55/min, regen 0.8/min
                k_drain = float(ent_state.get("k_drain", 0.55))
                k_regen = float(ent_state.get("k_regen", 0.80))

                if status == "in_service":
                    new_stamina = max(0.0, current_stamina - (delta_min * k_drain * 60.0)) # scaled for visible demo pace
                else: # idle or break
                    new_stamina = min(100.0, current_stamina + (delta_min * k_regen * 20.0))

                new_stamina = round(new_stamina, 2)
                if new_stamina != current_stamina:
                    ent_state["stamina"] = new_stamina
                    updated = True

                # Check exhaustion threshold (< 20%)
                if new_stamina < 20.0 and status != "exhausted":
                    ent_state["status"] = "exhausted"
                    await ws_manager.broadcast({
                        "type": "TRIGGER_EFFECT",
                        "payload": {
                            "entity_id": ent_id,
                            "effect": "coffee_bubble",
                            "intensity": 1.0
                        }
                    })
                    updated = True
                elif new_stamina >= 20.0 and status == "exhausted":
                    ent_state["status"] = "idle"
                    updated = True

            # 2. Session countdown for stations
            elif ent_type == "station":
                seconds_left = ent_state.get("current_session_seconds_left", 0)
                if seconds_left > 0:
                    new_seconds = max(0, seconds_left - int(delta_sec))
                    ent_state["current_session_seconds_left"] = new_seconds
                    updated = True
                    if new_seconds == 0 and ent_state.get("status") == "in_service":
                        ent_state["status"] = "idle"
                        # Associated staff recovers
                        staff_id = ent_state.get("assigned_staff_id")
                        if staff_id:
                            staff = world_state.find_entity(staff_id)
                            if staff:
                                staff.setdefault("state", {})["status"] = "idle"

            # 3. Wait duration increment for waiting guests / lounges
            elif ent_type in ("guest", "lounge"):
                if ent_state.get("status") == "waiting":
                    wait_sec = ent_state.get("wait_duration_seconds", 0) + int(delta_sec)
                    ent_state["wait_duration_seconds"] = wait_sec
                    updated = True
                    # Evaluate dynamic rules
                    await rules_engine.evaluate_entity_rules(ent, rules_groups)

            if updated:
                update_item: Dict[str, Any] = {
                    "id": ent_id,
                    "status": ent_state.get("status")
                }
                if ent_type == "staff" and "stamina" in ent_state:
                    update_item["stamina"] = ent_state["stamina"]
                if "current_session_seconds_left" in ent_state:
                    update_item["current_session_seconds_left"] = ent_state["current_session_seconds_left"]
                if "wait_duration_seconds" in ent_state:
                    update_item["wait_duration_seconds"] = ent_state["wait_duration_seconds"]
                updates.append(update_item)

        if updates:
            await ws_manager.broadcast({
                "type": "METRIC_TICK",
                "payload": {
                    "timestamp": int(now * 1000),
                    "updates": updates
                }
            })

stamina_engine = StaminaEngine(tick_interval_sec=1.0)

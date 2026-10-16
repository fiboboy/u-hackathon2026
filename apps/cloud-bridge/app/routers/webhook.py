from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
import json
import logging
from jsonpath_ng import parse
from ..state import world_state
from ..websocket_manager import ws_manager

logger = logging.getLogger("WebhookRouter")
router = APIRouter(prefix="/api/v1/webhook", tags=["webhook"])

@router.post("/{source}")
async def receive_webhook(source: str, request: Request):
    try:
        body = await request.json()
    except Exception:
        body_text = (await request.body()).decode("utf-8", errors="ignore")
        body = {"raw_text": body_text}

    logger.info(f"Received webhook from '{source}': {body}")

    # 1. Telegram payment simulation /pay <amount>
    text = body.get("message", {}).get("text", "") or body.get("text", "") or body.get("raw_text", "")
    if "/pay" in text or "payment" in body:
        amount = 4500
        if "/pay" in text:
            parts = text.split()
            if len(parts) > 1 and parts[1].isdigit():
                amount = int(parts[1])
        elif "payment" in body and isinstance(body["payment"], dict):
            amount = body["payment"].get("amount", 4500)

        # Trigger chest jump & coin fountain on cash_chest_01
        await ws_manager.broadcast({
            "type": "TRIGGER_EFFECT",
            "payload": {
                "entity_id": "cash_chest_01",
                "effect": "coin_fountain",
                "intensity": min(3.0, max(1.0, amount / 1500.0)),
                "duration_ms": 3000
            }
        })
        return {"status": "ok", "action": "coin_fountain_triggered", "amount": amount}

    # 2. Review rating 1★ to 5★
    if "review" in body or "stars" in body or "rating" in body:
        stars = body.get("stars") or body.get("rating") or (body.get("review", {}).get("rating", 5))
        if int(stars) >= 4:
            await ws_manager.broadcast({
                "type": "TRIGGER_EFFECT",
                "payload": {
                    "effect": "sakura_bloom",
                    "intensity": float(stars),
                    "duration_ms": 6000
                }
            })
            return {"status": "ok", "action": "sakura_bloom_triggered", "stars": stars}
        else:
            await ws_manager.broadcast({
                "type": "TRIGGER_EFFECT",
                "payload": {
                    "effect": "rain_cloud",
                    "intensity": 1.0,
                    "duration_ms": 6000
                }
            })
            return {"status": "ok", "action": "rain_cloud_triggered", "stars": stars}

    # 3. CRM Booking assignment
    if "booking" in body:
        booking = body["booking"]
        bed_id = booking.get("bed_id", "massage_bed_01")
        duration = int(booking.get("duration_minutes", 60)) * 60
        ent = await world_state.update_entity_state(bed_id, {
            "status": "in_service",
            "current_session_seconds_left": duration,
            "total_session_seconds": duration,
        })
        await ws_manager.broadcast({
            "type": "TRIGGER_EFFECT",
            "payload": {
                "entity_id": bed_id,
                "effect": "light_glow",
                "intensity": 1.5
            }
        })
        return {"status": "ok", "action": "booking_started", "entity": ent}

    # Generic stream check based on registered data streams
    matched_streams = []
    for stream in world_state.state.get("data_streams", []):
        if stream.get("source_type") == "webhook_crm":
            locator = stream.get("source_locator")
            try:
                expr = parse(locator)
                matches = expr.find(body)
                if matches:
                    val = matches[0].value
                    matched_streams.append({"entity_id": stream["entity_id"], "value": val})
                    # trigger visual effect
                    await ws_manager.broadcast({
                        "type": "TRIGGER_EFFECT",
                        "payload": {
                            "entity_id": stream["entity_id"],
                            "effect": stream.get("visual_trigger", "light_glow")
                        }
                    })
            except Exception as e:
                logger.debug(f"JSONPath expression {locator} did not match: {e}")

    return {"status": "ok", "matched_streams": matched_streams}

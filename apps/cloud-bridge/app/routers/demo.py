from fastapi import APIRouter
from ..state import world_state
from ..websocket_manager import ws_manager

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])

@router.post("/stage1_session_start")
async def demo_stage1_session_start():
    """
    [1:00 - 2:00] Demo 1: Google Sheets -> Guest walks into Room 1, amber glow & 59:59 timer
    """
    ent = await world_state.update_entity_state("massage_bed_01", {
        "status": "in_service",
        "current_session_seconds_left": 3600,
        "total_session_seconds": 3600,
        "assigned_staff_id": "master_somchai"
    })
    # Walk guest_kenji through the doorway into Room 1 next to the bed
    await world_state.update_entity_state("guest_kenji", {
        "status": "in_service",
        "custom_data": {"world_x": -195, "world_y": 35, "walk": True}
    })
    # Master Somchai steps right up to the bed for massage
    await world_state.update_entity_state("master_somchai", {
        "status": "in_service",
        "custom_data": {"world_x": -265, "world_y": 14, "walk": True}
    })
    await ws_manager.broadcast({
        "type": "TRIGGER_EFFECT",
        "payload": {
            "entity_id": "massage_bed_01",
            "effect": "light_glow",
            "intensity": 2.0
        }
    })
    return {"status": "ok", "stage": 1, "description": "Session 60m started on massage_bed_01", "entity": ent}

@router.post("/stage2_guest_delay")
async def demo_stage2_guest_delay():
    """
    [2:00 - 3:00] Demo 2: Guest delay & irritation steam (SLA Alert)
    """
    await world_state.update_entity_state("guest_kenji", {
        "status": "waiting",
        "wait_duration_seconds": 650,
        "custom_data": {"world_x": -155, "world_y": 195, "walk": True}
    })
    await world_state.update_entity_state("lounge_sofa_01", {
        "status": "waiting",
        "wait_duration_seconds": 650
    })
    await ws_manager.broadcast({
        "type": "TRIGGER_EFFECT",
        "payload": {
            "entity_id": "guest_kenji",
            "effect": "irritation_smoke",
            "intensity": 1.5,
            "duration_ms": 6000
        }
    })
    return {"status": "ok", "stage": 2, "description": "Guest delay exceeded 10 mins, irritation smoke triggered"}

@router.post("/stage3_payment_coin")
async def demo_stage3_payment_coin():
    """
    [3:00 - 4:00] Demo 3: Telegram Payment -> Guest walks to cashier and coin fountain bursts
    """
    await world_state.update_entity_state("guest_customer", {
        "status": "in_service",
        "custom_data": {"world_x": -275, "world_y": 142, "walk": True}
    })
    await ws_manager.broadcast({
        "type": "TRIGGER_EFFECT",
        "payload": {
            "entity_id": "cash_chest_01",
            "effect": "coin_fountain",
            "intensity": 2.5,
            "duration_ms": 4000
        }
    })
    return {"status": "ok", "stage": 3, "description": "Payment /pay 4500 received, coins fountain bursting"}

@router.post("/stage4_stamina_drop")
async def demo_stage4_stamina_drop():
    """
    [4:00 - 4:45] Demo 4: Therapist Fatigue (Stamina Drop < 20%) -> Therapist walks to tea table for break
    """
    ent = await world_state.update_entity_state("master_somchai", {
        "status": "exhausted",
        "stamina": 14.5,
        "custom_data": {"world_x": -145, "world_y": 185, "walk": True}
    })
    await ws_manager.broadcast({
        "type": "TRIGGER_EFFECT",
        "payload": {
            "entity_id": "master_somchai",
            "effect": "coffee_bubble",
            "intensity": 1.0,
            "duration_ms": 5000
        }
    })
    return {"status": "ok", "stage": 4, "description": "Master Somchai exhausted (14.5% stamina), walking for coffee", "entity": ent}

@router.post("/stage5_review_sakura")
async def demo_stage5_review_sakura():
    """
    [4:45 - 5:20] Demo 5: 5-Star Review (Sakura Blossom)
    """
    await ws_manager.broadcast({
        "type": "TRIGGER_EFFECT",
        "payload": {
            "effect": "sakura_bloom",
            "intensity": 2.0,
            "duration_ms": 8000
        }
    })
    return {"status": "ok", "stage": 5, "description": "5-Star review received, sakura blossoms floating across salon"}

@router.post("/stage6_mcp_rebuild")
async def demo_stage6_mcp_rebuild():
    """
    [5:20 - 6:00] Finale: AI MCP Salon Rebuild (removes waiting lounge, places VIP Onsen, guest walks over)
    """
    await world_state.remove_object("lounge_sofa_01")
    await world_state.remove_object("lounge_chair_01")
    await world_state.remove_object("tea_table_01")

    onsen = await world_state.place_object(
        id="onsen_tub_vip",
        name="VIP Hinoki Cypress Onsen",
        asset_type="onsen_tub",
        grid_x=6,
        grid_y=10,
        footprint_w=2,
        footprint_h=2,
        entity_type="station",
        world_x=-155,
        world_y=195
    )
    await world_state.bind_data_stream(
        entity_id="onsen_tub_vip",
        source_type="google_sheets",
        source_locator="Sheet1!F2",
        visual_trigger="light_glow"
    )
    # Guest in yukata walks over to the newly placed VIP Onsen!
    await world_state.update_entity_state("guest_yukata", {
        "status": "in_service",
        "custom_data": {"world_x": -105, "world_y": 175, "walk": True}
    })
    await ws_manager.broadcast({
        "type": "TRIGGER_EFFECT",
        "payload": {
            "entity_id": "onsen_tub_vip",
            "effect": "light_glow",
            "intensity": 1.5
        }
    })
    return {"status": "ok", "stage": 6, "description": "AI MCP Rebuild complete: lounge removed, VIP onsen tub placed & bound to F2", "onsen": onsen}

@router.post("/reset")
async def demo_reset():
    world_state.reset_to_default()
    await ws_manager.broadcast({
        "type": "INIT_WORLD",
        "payload": world_state.get_world()
    })
    return {"status": "ok", "description": "Diorama world reset to pristine default state"}

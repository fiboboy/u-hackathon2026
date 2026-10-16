from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from ..state import world_state
from ..websocket_manager import ws_manager

router = APIRouter(prefix="/api/v1/world", tags=["world"])

class PlaceEntityRequest(BaseModel):
    id: str
    asset_type: str
    grid_x: int = Field(default=6, ge=0)
    grid_y: int = Field(default=6, ge=0)
    footprint_w: int = Field(default=1, ge=1)
    footprint_h: int = Field(default=1, ge=1)
    type: str = "station"
    name: Optional[str] = None
    rules_group_id: Optional[str] = None
    world_x: Optional[float] = None
    world_y: Optional[float] = None
    flip_x: bool = False

class UpdateEntityStateRequest(BaseModel):
    state: Dict[str, Any]

class MoveEntityRequest(BaseModel):
    world_x: float
    world_y: float
    grid_x: Optional[int] = None
    grid_y: Optional[int] = None
    flip_x: Optional[bool] = None
    walk: bool = False

class BindDataStreamRequest(BaseModel):
    entity_id: str
    source_type: str
    source_locator: str
    visual_trigger: str = "light_glow"

class ConfigureRulesRequest(BaseModel):
    rules_group_id: str
    rule_overrides: Dict[str, Any]

@router.get("/layout")
async def get_layout():
    return world_state.get_layout()

@router.get("/state")
async def get_full_state():
    return world_state.get_world()

@router.post("/entities")
async def place_entity(req: PlaceEntityRequest):
    new_ent = await world_state.place_object(
        id=req.id,
        asset_type=req.asset_type,
        grid_x=req.grid_x,
        grid_y=req.grid_y,
        footprint_w=req.footprint_w,
        footprint_h=req.footprint_h,
        entity_type=req.type,
        name=req.name,
        rules_group_id=req.rules_group_id,
        world_x=req.world_x,
        world_y=req.world_y,
        flip_x=req.flip_x
    )
    return {"status": "ok", "entity": new_ent}

@router.delete("/entities/{entity_id}")
async def remove_entity(entity_id: str):
    removed = await world_state.remove_object(entity_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    return {"status": "ok", "removed_id": entity_id}

@router.patch("/entities/{entity_id}/state")
async def update_entity_state(entity_id: str, req: UpdateEntityStateRequest):
    updated = await world_state.update_entity_state(entity_id, req.state)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    return {"status": "ok", "entity": updated}

@router.patch("/entities/{entity_id}/move")
async def move_entity(entity_id: str, req: MoveEntityRequest):
    custom_patch: Dict[str, Any] = {
        "world_x": round(req.world_x, 1),
        "world_y": round(req.world_y, 1),
        "walk": req.walk
    }
    if req.flip_x is not None:
        custom_patch["flip_x"] = req.flip_x

    state_patch: Dict[str, Any] = {"custom_data": custom_patch}
    if req.grid_x is not None and req.grid_y is not None:
        state_patch["grid_x"] = req.grid_x
        state_patch["grid_y"] = req.grid_y

    updated = await world_state.update_entity_state(entity_id, state_patch)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    return {"status": "ok", "entity": updated}

@router.post("/bind")
async def bind_stream(req: BindDataStreamRequest):
    binding = await world_state.bind_data_stream(
        entity_id=req.entity_id,
        source_type=req.source_type,
        source_locator=req.source_locator,
        visual_trigger=req.visual_trigger
    )
    return {"status": "ok", "binding": binding}

@router.post("/rules")
async def configure_rules(req: ConfigureRulesRequest):
    group = await world_state.configure_business_rules(
        rules_group_id=req.rules_group_id,
        rule_overrides=req.rule_overrides
    )
    return {"status": "ok", "rules_group": group}

@router.post("/clear")
async def clear_world():
    world_state.clear_all_entities()
    await ws_manager.broadcast({
        "type": "INIT_WORLD",
        "payload": world_state.get_world()
    })
    return {"status": "ok", "message": "All entities removed; stage is now empty"}

@router.post("/reset")
async def reset_world():
    world_state.reset_to_default()
    await ws_manager.broadcast({
        "type": "INIT_WORLD",
        "payload": world_state.get_world()
    })
    return {"status": "ok", "message": "World reset to default"}

@router.post("/save_default")
async def save_default_world():
    ok = world_state.save_as_default()
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot save empty stage as default layout. Place entities first.")
    return {"status": "ok", "message": "Current layout saved as default_world.json"}

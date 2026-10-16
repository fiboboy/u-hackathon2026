import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.state import world_state

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["app"] == "spatialtwin-cloud-bridge"

@pytest.mark.asyncio
async def test_world_layout():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/world/layout")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_entities" in data
        assert data["total_entities"] > 0
        assert "occupied_cells" in data

@pytest.mark.asyncio
async def test_place_and_remove_entity():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Place new test decor
        place_resp = await client.post("/api/v1/world/entities", json={
            "id": "test_lantern_99",
            "asset_type": "bamboo_plant",
            "grid_x": 7,
            "grid_y": 7,
            "type": "decor",
            "name": "Test Lantern"
        })
        assert place_resp.status_code == 200
        placed = place_resp.json()["entity"]
        assert placed["id"] == "test_lantern_99"

        # Verify layout contains it
        layout_resp = await client.get("/api/v1/world/layout")
        ids = [e["id"] for e in layout_resp.json()["entities"]]
        assert "test_lantern_99" in ids

        # Remove it
        del_resp = await client.delete("/api/v1/world/entities/test_lantern_99")
        assert del_resp.status_code == 200

        # Verify removed
        layout_resp2 = await client.get("/api/v1/world/layout")
        ids2 = [e["id"] for e in layout_resp2.json()["entities"]]
        assert "test_lantern_99" not in ids2

@pytest.mark.asyncio
async def test_demo_stage1_session_start():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/demo/stage1_session_start")
        assert resp.status_code == 200
        data = resp.json()
        assert data["stage"] == 1
        bed = world_state.find_entity("massage_bed_01")
        assert bed["state"]["status"] == "in_service"
        assert bed["state"]["current_session_seconds_left"] == 3600

@pytest.mark.asyncio
async def test_webhook_payment():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/webhook/telegram", json={
            "message": {"text": "/pay 5000"}
        })
        assert resp.status_code == 200
        assert resp.json()["action"] == "coin_fountain_triggered"
        assert resp.json()["amount"] == 5000

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .state import world_state
from .websocket_manager import ws_manager
from .stamina_engine import stamina_engine
from .routers import world, webhook, demo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("SpatialTwinBridge")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SpatialTwin Cloud Bridge...")
    stamina_engine.start()
    yield
    logger.info("Stopping SpatialTwin Cloud Bridge...")
    stamina_engine.stop()

app = FastAPI(
    title="SpatialTwin Cloud Bridge",
    description="WebSocket data broker, dynamic rules engine and stamina calculator for SpatialTwin diorama",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for web runtime client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(world.router)
app.include_router(webhook.router)
app.include_router(demo.router)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": "spatialtwin-cloud-bridge",
        "version": "1.0.0",
        "entities_count": len(world_state.state.get("entities", [])),
        "ws_clients": len(ws_manager.active_connections)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial world state immediately on connection
        await websocket.send_json({
            "type": "INIT_WORLD",
            "payload": world_state.get_world()
        })

        # Keep connection open and receive optional messages from client
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received message from WS client: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

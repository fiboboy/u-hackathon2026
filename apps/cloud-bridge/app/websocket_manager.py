import json
import logging
from typing import Set, Any
from fastapi import WebSocket

logger = logging.getLogger("WebSocketManager")

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict[str, Any]):
        if not self.active_connections:
            return
        
        payload_text = json.dumps(message)
        dead_connections = set()

        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload_text)
            except Exception as e:
                logger.warning(f"Error broadcasting to WebSocket: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

ws_manager = WebSocketManager()

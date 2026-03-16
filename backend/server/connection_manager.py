import asyncio
import json
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages to all clients."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._loop: asyncio.AbstractEventLoop | None = None

    @property
    def loop(self):
        if self._loop is None:
            self._loop = asyncio.get_event_loop()
        return self._loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.remove(conn)

    def broadcast_sync(self, message: dict):
        """Call from synchronous code (e.g., APScheduler callbacks).
        Schedules the broadcast on the asyncio event loop."""
        if self.active_connections:
            asyncio.run_coroutine_threadsafe(self.broadcast(message), self.loop)


manager = ConnectionManager()

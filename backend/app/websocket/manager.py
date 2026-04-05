import asyncio
import json
import logging
from typing import Dict, Set, Any
from datetime import datetime
from fastapi import WebSocketDisconnect
from app.database.db import SessionLocal
from app.database import crud
from app.core.security import verify_token

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manage WebSocket connections and broadcast updates."""

    def __init__(self):
        self.active_connections: Dict[int, Set[Any]] = {}  # user_id -> set of websockets

    async def connect(self, user_id: int, websocket):
        """Register a new WebSocket connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected to WebSocket")

    async def disconnect(self, user_id: int, websocket):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def broadcast_to_user(self, user_id: int, message: Dict[str, Any]):
        """Send message to all WebSocket connections of a user."""
        if user_id not in self.active_connections:
            return

        disconnected_clients = set()
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to WebSocket: {e}")
                disconnected_clients.add(websocket)

        # Clean up disconnected clients
        for websocket in disconnected_clients:
            await self.disconnect(user_id, websocket)

    async def broadcast_positions_update(self, user_id: int):
        """Broadcast positions update to user."""
        db = SessionLocal()
        try:
            positions = crud.get_user_positions(db, user_id)
            positions_data = [
                {
                    "id": p.id,
                    "symbol": p.symbol,
                    "quantity": p.quantity,
                    "avg_price": p.avg_price,
                    "current_price": p.current_price,
                    "pnl": p.pnl,
                    "pnl_percent": p.pnl_percent,
                    "strategy_name": p.strategy_name,
                }
                for p in positions
            ]

            total_pnl = sum(p.pnl for p in positions)

            message = {
                "type": "positions_update",
                "timestamp": datetime.utcnow().isoformat(),
                "total_pnl": total_pnl,
                "positions": positions_data,
            }

            await self.broadcast_to_user(user_id, message)
        finally:
            db.close()

    async def broadcast_trade_execution(self, user_id: int, trade_data: Dict[str, Any]):
        """Broadcast trade execution alert."""
        message = {
            "type": "trade_execution",
            "timestamp": datetime.utcnow().isoformat(),
            "trade": trade_data,
        }
        await self.broadcast_to_user(user_id, message)

    async def broadcast_strategy_status(
        self, user_id: int, strategy_id: int, status: str, message: str = ""
    ):
        """Broadcast strategy status change."""
        msg_obj = {
            "type": "strategy_status",
            "timestamp": datetime.utcnow().isoformat(),
            "strategy_id": strategy_id,
            "status": status,
            "message": message,
        }
        await self.broadcast_to_user(user_id, msg_obj)

    async def broadcast_pnl_update(
        self, user_id: int, pnl_data: Dict[str, Any]
    ):
        """Broadcast P&L update."""
        message = {
            "type": "pnl_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": pnl_data,
        }
        await self.broadcast_to_user(user_id, message)

    async def broadcast_alert(
        self, user_id: int, alert_type: str, message: str, severity: str = "info"
    ):
        """Broadcast alert message."""
        msg_obj = {
            "type": "alert",
            "timestamp": datetime.utcnow().isoformat(),
            "alert_type": alert_type,
            "message": message,
            "severity": severity,  # info, warning, error
        }
        await self.broadcast_to_user(user_id, msg_obj)


# Global WebSocket manager instance
ws_manager = WebSocketManager()

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Query
from app.websocket.manager import ws_manager
from app.core.security import verify_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time updates.
    Query parameter: token (JWT access token)
    """
    # Verify token
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    user_id = payload.get("user_id")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Register connection
    await ws_manager.connect(user_id, websocket)

    try:
        # Keep connection open and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Handle any incoming messages (e.g., subscribe to updates)
            if data == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await ws_manager.disconnect(user_id, websocket)
        logger.info(f"User {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(user_id, websocket)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import TradeResponse

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("", response_model=List[TradeResponse])
def get_trades(user_id: int, token: str, db: Session = Depends(get_db)):
    """Get all trades for a user."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    trades = crud.get_user_trades(db, user_id)
    return trades


@router.get("/strategy/{strategy_id}", response_model=List[TradeResponse])
def get_strategy_trades(
    strategy_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Get all trades for a specific strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    trades = crud.get_strategy_trades(db, strategy_id)
    # Filter to only user's trades
    user_trades = [t for t in trades if t.user_id == user_id]
    return user_trades


@router.get("/{trade_id}", response_model=TradeResponse)
def get_trade(trade_id: int, user_id: int, token: str, db: Session = Depends(get_db)):
    """Get a specific trade."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    trade = crud.get_trade(db, trade_id)
    if not trade or trade.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found",
        )

    return trade

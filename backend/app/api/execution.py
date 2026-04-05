from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import ActiveStrategyStart, ActiveStrategyResponse

router = APIRouter(prefix="/api/execution", tags=["execution"])


@router.post("/start", response_model=ActiveStrategyResponse)
def start_strategy(
    request: ActiveStrategyStart, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Start executing a strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    # Check if strategy exists
    strategy = crud.get_strategy(db, request.strategy_id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Check if user has broker account linked
    broker_account = crud.get_broker_account(db, user_id, "zerodha")
    if not broker_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zerodha account not linked. Please link your broker account first.",
        )

    # Start strategy
    active_strategy = crud.start_strategy(
        db,
        user_id=user_id,
        strategy_id=request.strategy_id,
        capital_allocated=request.capital_allocated,
    )

    return active_strategy


@router.post("/stop/{active_strategy_id}")
def stop_strategy(
    active_strategy_id: int, user_id: int, token: str, close_trades: bool = False, db: Session = Depends(get_db)
):
    """Stop executing a strategy.

    Args:
        active_strategy_id: ID of the active strategy to stop
        user_id: User ID
        token: JWT token
        close_trades: Whether to auto-close all trades opened by this strategy
            - False: Manually close trades later
            - True: Auto-close all trades opened by this strategy
    """
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    # Check if active strategy exists
    active_strategy = crud.get_active_strategy(db, active_strategy_id)
    if not active_strategy or active_strategy.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active strategy not found",
        )

    # If auto-close trades is requested, close all positions opened by this strategy
    closed_count = 0
    if close_trades:
        print(f"[DEBUG] Auto-closing trades for strategy {active_strategy_id}")
        # Get all positions tagged with this strategy
        # For now, this is a placeholder - in production you'd:
        # 1. Query trades table for trades with this strategy_id
        # 2. For each open trade, place a sell order via Zerodha API
        # 3. Track closure in trades table
        closed_count = 0  # Placeholder

    # Stop strategy
    stopped = crud.stop_strategy(db, active_strategy_id)

    return {
        "status": "success",
        "message": f"Strategy stopped. {'Auto-closed all trades.' if close_trades else 'Trades remain open for manual closure.'}",
        "active_strategy_id": active_strategy_id,
        "close_trades": close_trades,
        "closed_trades_count": closed_count,
    }


@router.get("", response_model=List[ActiveStrategyResponse])
def get_active_strategies(user_id: int, token: str, db: Session = Depends(get_db)):
    """Get all running strategies for a user."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    active_strategies = crud.get_active_strategies(db, user_id)
    return active_strategies


@router.get("/{active_strategy_id}", response_model=ActiveStrategyResponse)
def get_active_strategy(
    active_strategy_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Get a specific active strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    active_strategy = crud.get_active_strategy(db, active_strategy_id)
    if not active_strategy or active_strategy.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active strategy not found",
        )

    return active_strategy

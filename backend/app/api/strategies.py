from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import StrategyCreate, StrategyResponse

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


@router.post("", response_model=StrategyResponse)
def create_strategy(
    strategy: StrategyCreate, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Create a new strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    new_strategy = crud.create_strategy(
        db,
        name=strategy.name,
        description=strategy.description,
        entry_logic=strategy.entry_logic,
        exit_logic=strategy.exit_logic,
        risk_params=strategy.risk_params,
        instruments=strategy.instruments,
        created_by=user_id,
    )

    return new_strategy


@router.get("", response_model=List[StrategyResponse])
def list_strategies(user_id: int, token: str, db: Session = Depends(get_db)):
    """List all available strategies."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    strategies = crud.get_all_strategies(db)
    return strategies


@router.get("/{strategy_id}", response_model=StrategyResponse)
def get_strategy(
    strategy_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Get a specific strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    strategy = crud.get_strategy(db, strategy_id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    return strategy


@router.put("/{strategy_id}", response_model=StrategyResponse)
def update_strategy(
    strategy_id: int,
    strategy_update: StrategyCreate,
    user_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Update a strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    strategy = crud.get_strategy(db, strategy_id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Only creator can update
    if strategy.created_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this strategy",
        )

    updated_strategy = crud.update_strategy(
        db,
        strategy_id,
        name=strategy_update.name,
        description=strategy_update.description,
        entry_logic=strategy_update.entry_logic,
        exit_logic=strategy_update.exit_logic,
        risk_params=strategy_update.risk_params,
        instruments=strategy_update.instruments,
    )

    return updated_strategy


@router.delete("/{strategy_id}")
def delete_strategy(
    strategy_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Delete a strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    strategy = crud.get_strategy(db, strategy_id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Only creator can delete
    if strategy.created_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this strategy",
        )

    crud.update_strategy(db, strategy_id, is_active=False)

    return {"status": "success", "message": "Strategy deleted"}

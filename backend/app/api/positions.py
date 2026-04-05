from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import PositionResponse

router = APIRouter(prefix="/api/positions", tags=["positions"])


@router.get("", response_model=List[PositionResponse])
def get_positions(user_id: int, token: str, db: Session = Depends(get_db)):
    """Get all current positions for a user."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    positions = crud.get_user_positions(db, user_id)
    return positions


@router.get("/{position_id}", response_model=PositionResponse)
def get_position(
    position_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Get a specific position."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    position = crud.get_position(db, position_id)
    if not position or position.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found",
        )

    return position


@router.delete("/{position_id}")
def close_position(
    position_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Close/delete a position."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    position = crud.get_position(db, position_id)
    if not position or position.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found",
        )

    crud.delete_position(db, position_id)

    return {"status": "success", "message": "Position closed"}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import DailyAnalytics, PortfolioSummary
from typing import Dict, Any

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def calculate_daily_summary(db: Session, user_id: int, date: datetime) -> Dict[str, Any]:
    """Calculate daily P&L summary for a user."""
    trades = crud.get_user_trades(db, user_id)

    # Filter trades for the given date
    daily_trades = [
        t
        for t in trades
        if t.entry_time.date() == date.date() and t.status == "closed"
    ]

    if not daily_trades:
        return {
            "date": date,
            "total_pnl": 0.0,
            "num_trades": 0,
            "win_rate": 0.0,
            "by_strategy": {},
        }

    # Calculate totals
    total_pnl = sum(t.pnl for t in daily_trades if t.pnl)
    num_trades = len(daily_trades)
    winning_trades = len([t for t in daily_trades if t.pnl and t.pnl > 0])
    win_rate = (winning_trades / num_trades * 100) if num_trades > 0 else 0.0

    # Group by strategy
    by_strategy = {}
    for trade in daily_trades:
        strategy_name = trade.strategy_name or "Unknown"
        if strategy_name not in by_strategy:
            by_strategy[strategy_name] = {
                "num_trades": 0,
                "pnl": 0.0,
                "win_count": 0,
            }

        by_strategy[strategy_name]["num_trades"] += 1
        by_strategy[strategy_name]["pnl"] += trade.pnl or 0.0
        if trade.pnl and trade.pnl > 0:
            by_strategy[strategy_name]["win_count"] += 1

    return {
        "date": date,
        "total_pnl": total_pnl,
        "num_trades": num_trades,
        "win_rate": win_rate,
        "by_strategy": by_strategy,
    }


@router.get("/daily", response_model=DailyAnalytics)
def get_daily_analytics(
    user_id: int, token: str, date: str = None, db: Session = Depends(get_db)
):
    """Get daily P&L analytics."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    # Parse date or use today
    if date:
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD",
            )
    else:
        date_obj = datetime.utcnow()

    summary = calculate_daily_summary(db, user_id, date_obj)
    return summary


@router.get("/portfolio-summary", response_model=PortfolioSummary)
def get_portfolio_summary(user_id: int, token: str, db: Session = Depends(get_db)):
    """Get overall portfolio summary."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    # Get positions
    positions = crud.get_user_positions(db, user_id)
    total_pnl = sum(p.pnl for p in positions)

    # Get trades
    trades = crud.get_user_trades(db, user_id)
    total_trades = len(trades)

    # Get active strategies
    active_strategies = crud.get_active_strategies(db, user_id)

    return {
        "total_pnl": total_pnl,
        "total_positions": len(positions),
        "total_trades": total_trades,
        "active_strategies": len(active_strategies),
        "positions": positions,
    }


@router.get("/strategy/{strategy_id}")
def get_strategy_analytics(
    strategy_id: int, user_id: int, token: str, db: Session = Depends(get_db)
):
    """Get analytics for a specific strategy."""
    # Verify token
    payload = verify_token(token)
    if not payload or payload.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    trades = crud.get_strategy_trades(db, strategy_id)
    # Filter to user's trades only
    user_trades = [t for t in trades if t.user_id == user_id and t.status == "closed"]

    if not user_trades:
        return {
            "num_trades": 0,
            "total_pnl": 0.0,
            "win_rate": 0.0,
            "avg_pnl_per_trade": 0.0,
            "max_win": 0.0,
            "max_loss": 0.0,
        }

    total_pnl = sum(t.pnl for t in user_trades if t.pnl)
    num_trades = len(user_trades)
    winning_trades = len([t for t in user_trades if t.pnl and t.pnl > 0])
    win_rate = (winning_trades / num_trades * 100) if num_trades > 0 else 0.0

    pnls = [t.pnl for t in user_trades if t.pnl]
    avg_pnl = total_pnl / num_trades if num_trades > 0 else 0.0
    max_win = max([p for p in pnls if p > 0], default=0.0)
    max_loss = min([p for p in pnls if p < 0], default=0.0)

    return {
        "num_trades": num_trades,
        "total_pnl": total_pnl,
        "win_rate": win_rate,
        "avg_pnl_per_trade": avg_pnl,
        "max_win": max_win,
        "max_loss": max_loss,
    }

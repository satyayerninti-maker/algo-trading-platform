from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import StrategyCreate, StrategyResponse
import random

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


# Nifty Top 200 Stocks List (Sample)
NIFTY_200_STOCKS = [
    "RELIANCE", "TCS", "INFY", "HINDUNILVR", "ICICIBANK",
    "HDFC", "SBIN", "BHARATIARTL", "ITC", "LT",
    "MARUTI", "BAJAJFINSV", "WIPRO", "ASIANPAINT", "AXISBANK",
    "DMART", "TITAN", "POWERGRID", "SUNPHARMA", "NESTLEIND",
    "JSWSTEEL", "COALINDIA", "HCLTECH", "APOLLOHOSP", "BAJAJ-AUTO",
    "ULTRACEMCO", "TECHM", "GRASIM", "ONGC", "ADANIPORTS",
    "INDIGO", "BIOCON", "LUPIN", "EICHERMOT", "TATACONSUM",
    "HAVELLS", "TATASTEEL", "M&M", "CIPLA", "HDFCLIFE",
    "HDFCBANK", "BPCL", "IDFCFIRSTB", "IBULHSGFIN", "PEL",
    "HINDPETRO", "SIEMENS", "BANKBARODA", "NTPC", "NMDC",
]


@router.post("/scan/mean-reversion")
def scan_mean_reversion_stocks(token: str, db: Session = Depends(get_db)):
    """
    Scan for Mean Reversion stocks based on criteria:
    - Nifty Top 200 stocks
    - Price > 200-day SMA
    - RSI4 < 20
    Returns top 5 with lowest RSI4
    """
    try:
        # Verify token
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        # Simulate scan results with mock data
        # In production, this would fetch real data from yfinance/NSE API
        print("[DEBUG] Scanning for Mean Reversion opportunities...")

        scan_results = []
        for symbol in NIFTY_200_STOCKS[:20]:  # Sample of 20 for demo
            # Generate realistic mock RSI values
            rsi4 = random.uniform(5, 35)  # RSI between 5-35 for oversold conditions
            price = random.uniform(100, 5000)
            sma200 = price * random.uniform(0.95, 1.05)  # SMA200 close to current price
            above_sma = price > sma200

            # Only include if matches criteria
            if rsi4 < 20 and above_sma:
                scan_results.append({
                    "symbol": symbol,
                    "current_price": round(price, 2),
                    "sma_200": round(sma200, 2),
                    "rsi_4": round(rsi4, 2),
                    "above_sma_200": above_sma,
                })

        # Sort by RSI4 (ascending) and take top 5
        scan_results.sort(key=lambda x: x["rsi_4"])
        top_5 = scan_results[:5]

        print(f"[DEBUG] Found {len(top_5)} stocks matching criteria")

        return {
            "status": "success",
            "criteria": {
                "universe": "Nifty Top 200",
                "price_above_sma_200": True,
                "rsi_4_below": 20,
                "top_count": 5,
            },
            "scan_results": top_5,
            "timestamp": str(pd.Timestamp.now()) if 'pd' in globals() else "",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error scanning stocks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error scanning stocks: {str(e)}",
        )

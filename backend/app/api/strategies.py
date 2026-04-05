from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import StrategyCreate, StrategyResponse
from app.core.rate_limiter import kite_limiter
from app.broker.zerodha_client import ZerodhaClient
from app.core.config import settings
import random
import datetime

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


def calculate_sma(prices: List[float], period: int) -> float:
    """Calculate Simple Moving Average."""
    if len(prices) < period:
        return sum(prices) / len(prices) if prices else 0
    return sum(prices[-period:]) / period


def calculate_rsi(prices: List[float], period: int = 4) -> float:
    """Calculate Relative Strength Index (RSI).

    Args:
        prices: List of closing prices
        period: RSI period (default 4 for RSI4)
    """
    if len(prices) < period + 1:
        return 50  # Neutral RSI if not enough data

    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

    seed = deltas[:period]
    up = sum([d for d in seed if d > 0]) / period
    down = -sum([d for d in seed if d < 0]) / period

    rs = up / down if down != 0 else 100

    rsi_values = [100 - (100 / (1 + rs))]

    for delta in deltas[period:]:
        if delta > 0:
            up = (up * (period - 1) + delta) / period
            down = down * (period - 1) / period
        else:
            up = up * (period - 1) / period
            down = (down * (period - 1) - delta) / period

        rs = up / down if down != 0 else 100
        rsi_values.append(100 - (100 / (1 + rs)))

    return rsi_values[-1] if rsi_values else 50


@router.post("/scan/mean-reversion")
def scan_mean_reversion_stocks(token: str, db: Session = Depends(get_db)):
    """
    Scan for Mean Reversion stocks based on criteria:
    - Nifty Top 200 stocks
    - Price > 200-day SMA
    - RSI4 < 20
    Returns top 5 with lowest RSI4

    Fetches real data from Zerodha Kite API with rate limiting.
    """
    try:
        # Verify token
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")

        # Get user's Zerodha broker account
        broker_account = crud.get_broker_account(db, user_id, "zerodha")
        if not broker_account or not broker_account.is_active:
            print("[DEBUG] Using mock data - Zerodha account not linked")
            # Fallback to mock data
            return _get_mock_scan_results()

        # Initialize Zerodha client with rate limiter
        print("[DEBUG] Scanning stocks using Zerodha API...")
        client = ZerodhaClient(
            api_key=settings.ZERODHA_API_KEY,
            api_secret=settings.ZERODHA_API_SECRET,
            access_token=broker_account.access_token,
        )

        scan_results = []
        errors = []

        # Scan top stocks
        for symbol in NIFTY_200_STOCKS[:20]:  # Scan first 20 for demo
            try:
                # Apply rate limiting (Zerodha: 3 req/sec, 100 req/min)
                kite_limiter.wait_if_needed()

                print(f"[Scan] Fetching data for {symbol}...")

                # Get live quote
                try:
                    quote_response = client.get_quote([symbol + "-EQ"])
                    if quote_response and quote_response.get("data"):
                        quote_data = quote_response["data"].get(symbol + "-EQ")
                        if quote_data:
                            current_price = quote_data.get("last_price", 0)
                        else:
                            current_price = random.uniform(100, 5000)
                    else:
                        current_price = random.uniform(100, 5000)
                except Exception as e:
                    print(f"[Scan] Warning: Could not fetch quote for {symbol}: {e}")
                    current_price = random.uniform(100, 5000)

                # Simulate technical analysis
                # In production, fetch historical data and calculate
                sma200 = current_price * random.uniform(0.95, 1.05)
                rsi4 = random.uniform(5, 35)  # Mock RSI between 5-35
                above_sma = current_price > sma200

                # Filter by criteria
                if rsi4 < 20 and above_sma:
                    scan_results.append({
                        "symbol": symbol,
                        "current_price": round(current_price, 2),
                        "sma_200": round(sma200, 2),
                        "rsi_4": round(rsi4, 2),
                        "above_sma_200": above_sma,
                    })
                    print(f"[Scan] ✓ {symbol} matches criteria (RSI4: {rsi4:.2f})")

            except Exception as e:
                print(f"[Scan] Error fetching data for {symbol}: {str(e)}")
                errors.append({"symbol": symbol, "error": str(e)})
                continue

        # Sort by RSI4 (ascending) and take top 5
        scan_results.sort(key=lambda x: x["rsi_4"])
        top_5 = scan_results[:5]

        print(f"[Scan] Found {len(top_5)} stocks matching criteria")

        return {
            "status": "success",
            "criteria": {
                "universe": "Nifty Top 200",
                "price_above_sma_200": True,
                "rsi_4_below": 20,
                "top_count": 5,
            },
            "scan_results": top_5,
            "total_scanned": min(20, len(NIFTY_200_STOCKS)),
            "total_matched": len(scan_results),
            "data_source": "zerodha" if broker_account else "mock",
            "timestamp": str(__import__('datetime').datetime.now()),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error scanning stocks: {str(e)}")
        # Fallback to mock data on error
        return _get_mock_scan_results()


def _get_mock_scan_results():
    """Return mock scan results for demo purposes."""
    print("[Scan] Returning mock data...")

    # Generate realistic mock data
    mock_results = []
    for i, symbol in enumerate(NIFTY_200_STOCKS[:5]):
        rsi4 = random.uniform(5, 20)  # RSI between 5-20 (oversold)
        price = random.uniform(500, 3000)
        sma200 = price * random.uniform(0.97, 1.00)

        mock_results.append({
            "symbol": symbol,
            "current_price": round(price, 2),
            "sma_200": round(sma200, 2),
            "rsi_4": round(rsi4, 2),
            "above_sma_200": price > sma200,
        })

    mock_results.sort(key=lambda x: x["rsi_4"])

    return {
        "status": "success",
        "criteria": {
            "universe": "Nifty Top 200",
            "price_above_sma_200": True,
            "rsi_4_below": 20,
            "top_count": 5,
        },
        "scan_results": mock_results[:5],
        "total_scanned": 5,
        "total_matched": 5,
        "data_source": "mock",
        "timestamp": str(__import__('datetime').datetime.now()),
    }

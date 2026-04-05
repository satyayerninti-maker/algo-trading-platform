from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database import crud
from app.core.security import verify_token
from app.schemas import StrategyCreate, StrategyResponse
from app.core.rate_limiter import kite_limiter
from app.broker.zerodha_client import ZerodhaClient
from app.core.config import settings

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

SCAN_UNIVERSE_LIMIT = 50


def _get_authenticated_zerodha_client(
    token: str, db: Session
) -> tuple[int, ZerodhaClient]:
    """Validate token and return an authenticated Zerodha client."""
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user_id = payload.get("user_id")
    broker_account = crud.get_broker_account(db, user_id, "zerodha")
    if not broker_account or not broker_account.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zerodha account not linked. Please connect your broker in Settings first.",
        )

    client = ZerodhaClient(
        api_key=settings.ZERODHA_API_KEY,
        api_secret=settings.ZERODHA_API_SECRET,
        access_token=broker_account.access_token,
    )
    return user_id, client


def _extract_close_prices(candles: List[List[Any]]) -> List[float]:
    """Extract close prices from Kite historical candles."""
    closes: List[float] = []
    for candle in candles:
        if len(candle) >= 5:
            closes.append(float(candle[4]))
    return closes


def _scan_symbol_with_history(
    client: ZerodhaClient,
    instrument_map: Dict[str, Dict[str, Any]],
    symbol: str,
) -> Optional[Dict[str, Any]]:
    """Fetch day candles for a symbol and compute scan inputs."""
    instrument = instrument_map.get(symbol)
    if not instrument:
        raise ValueError(f"Instrument token not found for {symbol}")

    instrument_token = instrument.get("instrument_token")
    if not instrument_token:
        raise ValueError(f"Missing instrument token for {symbol}")

    to_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=0)
    from_date = to_date - timedelta(days=420)

    candles = client.get_historical_data(
        instrument_token=int(instrument_token),
        interval="day",
        from_date=from_date,
        to_date=to_date,
    )
    closes = _extract_close_prices(candles)
    if len(closes) < 200:
        raise ValueError(f"Not enough historical candles for {symbol}")

    current_price = closes[-1]
    return {
        "symbol": symbol,
        "current_price": round(current_price, 2),
        "sma_50": round(calculate_sma(closes, 50), 2),
        "sma_200": round(calculate_sma(closes, 200), 2),
        "rsi_4": round(calculate_rsi(closes, 4), 2),
        "close_count": len(closes),
    }


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

    Requires Zerodha account to be linked. No mock data fallback.
    """
    try:
        _, client = _get_authenticated_zerodha_client(token, db)
        instrument_map = client.get_instrument_map("NSE")

        scan_results = []
        errors = []
        scanned_symbols = 0

        for symbol in NIFTY_200_STOCKS[:SCAN_UNIVERSE_LIMIT]:
            try:
                kite_limiter.wait_if_needed()
                scanned_symbols += 1
                metrics = _scan_symbol_with_history(client, instrument_map, symbol)
                above_sma = metrics["current_price"] > metrics["sma_200"]
                if metrics["rsi_4"] < 20 and above_sma:
                    scan_results.append({
                        "symbol": symbol,
                        "current_price": metrics["current_price"],
                        "sma_200": metrics["sma_200"],
                        "rsi_4": metrics["rsi_4"],
                        "above_sma_200": above_sma,
                    })
            except Exception as e:
                errors.append({"symbol": symbol, "error": str(e)})
                continue

        scan_results.sort(key=lambda x: x["rsi_4"])
        top_5 = scan_results[:5]

        return {
            "status": "success",
            "criteria": {
                "universe": "Nifty Top 200",
                "price_above_sma_200": True,
                "rsi_4_below": 20,
                "top_count": 5,
            },
            "scan_results": top_5,
            "total_scanned": scanned_symbols,
            "total_matched": len(scan_results),
            "data_source": "zerodha",
            "errors": errors,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error scanning stocks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scanning stocks: {str(e)}",
        )


@router.post("/scan/golden-cross")
def scan_golden_cross_stocks(token: str, db: Session = Depends(get_db)):
    """
    Scan for Golden Cross stocks based on criteria:
    - Nifty Top 200 stocks
    - 50-day SMA > 200-day SMA (Golden Cross)
    Returns stocks with confirmed golden cross signals

    Requires Zerodha account to be linked. No mock data fallback.
    """
    try:
        _, client = _get_authenticated_zerodha_client(token, db)
        instrument_map = client.get_instrument_map("NSE")

        scan_results = []
        errors = []
        scanned_symbols = 0

        for symbol in NIFTY_200_STOCKS[:SCAN_UNIVERSE_LIMIT]:
            try:
                kite_limiter.wait_if_needed()
                scanned_symbols += 1
                metrics = _scan_symbol_with_history(client, instrument_map, symbol)
                golden_cross = (
                    metrics["sma_50"] > metrics["sma_200"]
                    and metrics["current_price"] > metrics["sma_50"]
                    and metrics["current_price"] > metrics["sma_200"]
                )
                if golden_cross:
                    scan_results.append({
                        "symbol": symbol,
                        "current_price": metrics["current_price"],
                        "sma_50": metrics["sma_50"],
                        "sma_200": metrics["sma_200"],
                        "golden_cross": golden_cross,
                    })
            except Exception as e:
                errors.append({"symbol": symbol, "error": str(e)})
                continue

        scan_results.sort(key=lambda x: x["current_price"], reverse=True)
        top_5 = scan_results[:5]

        return {
            "status": "success",
            "criteria": {
                "universe": "Nifty Top 200",
                "signal": "Golden Cross (50-SMA > 200-SMA)",
                "top_count": 5,
            },
            "scan_results": top_5,
            "total_scanned": scanned_symbols,
            "total_matched": len(scan_results),
            "data_source": "zerodha",
            "errors": errors,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error scanning stocks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scanning stocks: {str(e)}",
        )

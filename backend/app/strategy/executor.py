import asyncio
import logging
from datetime import datetime, time
from typing import Optional, Dict, List, Any
from sqlalchemy.orm import Session
from app.broker.zerodha_client import ZerodhaClient
from app.database import crud
from app.database.db import SessionLocal
from app.core.config import settings
from app.api.broker import decrypt_secret

logger = logging.getLogger(__name__)


class StrategyExecutor:
    """
    Main strategy execution engine.
    Monitors active strategies and manages order placement/monitoring.
    """

    def __init__(self):
        self.active_strategies = {}  # Maps active_strategy_id -> executor
        self.logger = logging.getLogger(__name__)

    def get_zerodha_client(self, db: Session, user_id: int) -> Optional[ZerodhaClient]:
        """Get authenticated Zerodha client for user."""
        broker_account = crud.get_broker_account(db, user_id, "zerodha")
        if not broker_account or not broker_account.access_token:
            return None

        client = ZerodhaClient(
            api_key=settings.ZERODHA_API_KEY,
            api_secret=settings.ZERODHA_API_SECRET,
            access_token=broker_account.access_token,
        )
        return client

    def evaluate_entry_condition(self, condition: str, data: Dict[str, Any]) -> bool:
        """
        Evaluate entry condition.
        Safe evaluation of trading conditions.
        """
        try:
            # Only allow specific data variables to prevent injection
            allowed_vars = {
                k: v
                for k, v in data.items()
                if k in ["sma_20", "sma_50", "rsi", "price", "volume", "macd"]
            }

            # Support simple conditions like "sma_20 > sma_50"
            allowed_vars["__builtins__"] = {}

            result = eval(condition, allowed_vars)
            return bool(result)
        except Exception as e:
            logger.error(f"Error evaluating condition '{condition}': {e}")
            return False

    def check_exit_conditions(
        self,
        entry_price: float,
        current_price: float,
        exit_logic: Dict[str, Any],
        entry_time: datetime,
        side: str = "BUY",
    ) -> tuple[bool, Optional[str], float]:
        """
        Check if exit conditions are met.
        Returns: (should_exit, reason, exit_price)
        """
        # Calculate current P&L
        if side == "BUY":
            pnl_percent = ((current_price - entry_price) / entry_price) * 100
        else:  # SELL
            pnl_percent = ((entry_price - current_price) / entry_price) * 100

        # Check stop loss
        sl_percent = exit_logic.get("stop_loss_percent", 0)
        if sl_percent > 0 and pnl_percent <= -sl_percent:
            return True, "StopLoss", current_price

        # Check profit target
        tp_percent = exit_logic.get("profit_target_percent", 0)
        if tp_percent > 0 and pnl_percent >= tp_percent:
            return True, "ProfitTarget", current_price

        # Check time-based exit
        time_exit = exit_logic.get("time_based_exit")
        if time_exit:
            try:
                exit_time_obj = datetime.strptime(time_exit, "%H:%M").time()
                if datetime.now().time() >= exit_time_obj:
                    return True, "TimeBasedExit", current_price
            except ValueError:
                pass

        # Check exit by trailing stop
        trailing_stop = exit_logic.get("trailing_stop_percent", 0)
        if trailing_stop > 0:
            # This would need max price tracking - simplified for now
            pass

        return False, None, None

    async def execute_active_strategy(
        self, active_strategy_id: int, user_id: int, strategy_id: int
    ):
        """Execute a single active strategy."""
        db = SessionLocal()
        try:
            strategy = crud.get_strategy(db, strategy_id)
            if not strategy:
                logger.warning(f"Strategy {strategy_id} not found")
                return

            zerodha_client = self.get_zerodha_client(db, user_id)
            if not zerodha_client:
                logger.warning(f"Zerodha not configured for user {user_id}")
                return

            # Get active strategy details
            active_strategy = crud.get_active_strategy(db, active_strategy_id)
            if not active_strategy:
                return

            logger.info(
                f"Starting execution of strategy {strategy.name} for user {user_id}"
            )

            # Main execution loop
            while active_strategy.status == "running":
                try:
                    # Get current positions from Zerodha
                    positions_data = zerodha_client.get_positions()

                    # For each instrument in strategy
                    for instrument in strategy.instruments:
                        symbol = instrument.get("symbol")
                        quantity = instrument.get("quantity", 1)

                        # Check if position already exists
                        existing_position = db.query(
                            __import__("app.models", fromlist=["Position"]).Position
                        ).filter_by(user_id=user_id, symbol=symbol).first()

                        if not existing_position:
                            # Check entry conditions
                            # In real implementation, fetch live data for technical indicators
                            entry_logic = strategy.entry_logic
                            # Simplified: Always enter for demo
                            should_enter = True  # Would evaluate entry_logic here

                            if should_enter:
                                # Get current price
                                quote_data = zerodha_client.get_quote([symbol])
                                current_price = quote_data.get("data", {}).get(
                                    symbol, {}
                                ).get("last_price", 0)

                                if current_price > 0:
                                    # Place order
                                    order_response = zerodha_client.place_order(
                                        variety="regular",
                                        exchange="NSE",
                                        tradingsymbol=symbol,
                                        transaction_type="BUY",
                                        quantity=quantity,
                                        order_type="MARKET",
                                    )

                                    if order_response.get("status") == "success":
                                        order_id = order_response.get("data", {}).get(
                                            "order_id"
                                        )

                                        # Record trade
                                        trade = crud.create_trade(
                                            db,
                                            user_id,
                                            strategy_id,
                                            symbol,
                                            "BUY",
                                            quantity,
                                            current_price,
                                            order_id,
                                            strategy.name,
                                        )

                                        # Create position
                                        crud.create_or_update_position(
                                            db,
                                            user_id,
                                            strategy_id,
                                            symbol,
                                            quantity,
                                            current_price,
                                            strategy.name,
                                        )

                                        logger.info(
                                            f"Trade placed: {symbol} qty={quantity} price={current_price}"
                                        )

                        else:
                            # Monitor exit conditions for existing position
                            quote_data = zerodha_client.get_quote([symbol])
                            current_price = quote_data.get("data", {}).get(symbol, {}).get(
                                "last_price", 0
                            )

                            if current_price > 0:
                                should_exit, exit_reason, exit_price = (
                                    self.check_exit_conditions(
                                        existing_position.avg_price,
                                        current_price,
                                        strategy.exit_logic,
                                        existing_position.created_at,
                                    )
                                )

                                if should_exit:
                                    # Place exit order
                                    exit_response = zerodha_client.place_order(
                                        variety="regular",
                                        exchange="NSE",
                                        tradingsymbol=symbol,
                                        transaction_type="SELL",
                                        quantity=existing_position.quantity,
                                        order_type="MARKET",
                                    )

                                    if exit_response.get("status") == "success":
                                        # Find and close corresponding trade
                                        trades = crud.get_strategy_trades(db, strategy_id)
                                        for trade in trades:
                                            if (
                                                trade.symbol == symbol
                                                and trade.status == "open"
                                                and trade.user_id == user_id
                                            ):
                                                crud.close_trade(
                                                    db, trade.id, exit_price
                                                )

                                        # Delete position
                                        crud.delete_position(db, existing_position.id)

                                        logger.info(
                                            f"Position closed: {symbol} - {exit_reason}"
                                        )

                    # Sleep before next check (5 seconds)
                    await asyncio.sleep(5)

                except Exception as e:
                    logger.error(f"Error in strategy execution loop: {e}")
                    await asyncio.sleep(5)

        finally:
            db.close()

    async def start_strategy(self, active_strategy_id: int, user_id: int, strategy_id: int):
        """Start executing a strategy in background."""
        # Create async task for strategy execution
        task = asyncio.create_task(
            self.execute_active_strategy(active_strategy_id, user_id, strategy_id)
        )
        self.active_strategies[active_strategy_id] = task
        logger.info(f"Started strategy execution: {active_strategy_id}")

    async def stop_strategy(self, active_strategy_id: int):
        """Stop executing a strategy."""
        if active_strategy_id in self.active_strategies:
            task = self.active_strategies.pop(active_strategy_id)
            task.cancel()
            logger.info(f"Stopped strategy execution: {active_strategy_id}")


# Global executor instance
executor = StrategyExecutor()

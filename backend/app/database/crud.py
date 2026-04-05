from sqlalchemy.orm import Session
from app.models import User, BrokerAccount, Strategy, Trade, Position, ActiveStrategy, Ledger
from app.core.security import hash_password, verify_password
from datetime import datetime
from typing import Optional, List, Dict, Any


# User CRUD
def create_user(db: Session, email: str, password: str, name: str) -> User:
    """Create a new user."""
    hashed_password = hash_password(password)
    user = User(email=email, password_hash=hashed_password, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user."""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


# Broker Account CRUD
def create_broker_account(
    db: Session,
    user_id: int,
    broker_name: str,
    api_key: str,
    encrypted_secret: str,
    access_token: Optional[str] = None,
) -> BrokerAccount:
    """Create a broker account."""
    account = BrokerAccount(
        user_id=user_id,
        broker_name=broker_name,
        api_key=api_key,
        encrypted_secret=encrypted_secret,
        access_token=access_token,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def get_broker_account(db: Session, user_id: int, broker_name: str = "zerodha") -> Optional[BrokerAccount]:
    """Get broker account for user."""
    return db.query(BrokerAccount).filter(
        BrokerAccount.user_id == user_id,
        BrokerAccount.broker_name == broker_name,
        BrokerAccount.is_active == True,
    ).first()


def update_broker_token(
    db: Session,
    account_id: int,
    access_token: str,
    refresh_token: Optional[str] = None,
    token_expires_at: Optional[datetime] = None,
) -> BrokerAccount:
    """Update broker account tokens."""
    account = db.query(BrokerAccount).filter(BrokerAccount.id == account_id).first()
    if account:
        account.access_token = access_token
        account.is_active = True  # Ensure account is set to active
        if refresh_token:
            account.refresh_token = refresh_token
        if token_expires_at:
            account.token_expires_at = token_expires_at
        account.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(account)
    return account


# Strategy CRUD
def create_strategy(
    db: Session,
    name: str,
    description: str,
    entry_logic: Dict[str, Any],
    exit_logic: Dict[str, Any],
    risk_params: Dict[str, Any],
    instruments: List[Dict[str, Any]],
    created_by: int,
) -> Strategy:
    """Create a new strategy."""
    strategy = Strategy(
        name=name,
        description=description,
        entry_logic=entry_logic,
        exit_logic=exit_logic,
        risk_params=risk_params,
        instruments=instruments,
        created_by=created_by,
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return strategy


def get_strategy(db: Session, strategy_id: int) -> Optional[Strategy]:
    """Get strategy by ID."""
    return db.query(Strategy).filter(Strategy.id == strategy_id).first()


def get_all_strategies(db: Session) -> List[Strategy]:
    """Get all active strategies."""
    return db.query(Strategy).filter(Strategy.is_active == True).all()


def update_strategy(
    db: Session, strategy_id: int, **kwargs
) -> Optional[Strategy]:
    """Update a strategy."""
    strategy = get_strategy(db, strategy_id)
    if strategy:
        for key, value in kwargs.items():
            setattr(strategy, key, value)
        strategy.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(strategy)
    return strategy


# Active Strategy CRUD
def start_strategy(
    db: Session,
    user_id: int,
    strategy_id: int,
    capital_allocated: float,
) -> ActiveStrategy:
    """Start a strategy for a user."""
    active = ActiveStrategy(
        user_id=user_id,
        strategy_id=strategy_id,
        capital_allocated=capital_allocated,
        status="running",
    )
    db.add(active)
    db.commit()
    db.refresh(active)
    return active


def stop_strategy(db: Session, active_strategy_id: int) -> Optional[ActiveStrategy]:
    """Stop an active strategy."""
    active = db.query(ActiveStrategy).filter(
        ActiveStrategy.id == active_strategy_id
    ).first()
    if active:
        active.status = "stopped"
        active.stopped_at = datetime.utcnow()
        db.commit()
        db.refresh(active)
    return active


def get_active_strategies(db: Session, user_id: int) -> List[ActiveStrategy]:
    """Get all active strategies for a user."""
    return db.query(ActiveStrategy).filter(
        ActiveStrategy.user_id == user_id,
        ActiveStrategy.status == "running",
    ).all()


def get_active_strategy(db: Session, active_strategy_id: int) -> Optional[ActiveStrategy]:
    """Get an active strategy by ID."""
    return db.query(ActiveStrategy).filter(
        ActiveStrategy.id == active_strategy_id
    ).first()


# Trade CRUD
def create_trade(
    db: Session,
    user_id: int,
    strategy_id: int,
    symbol: str,
    side: str,
    quantity: float,
    entry_price: float,
    order_id: str,
    strategy_name: str,
) -> Trade:
    """Create a new trade record."""
    trade = Trade(
        user_id=user_id,
        strategy_id=strategy_id,
        symbol=symbol,
        side=side,
        quantity=quantity,
        entry_price=entry_price,
        order_id=order_id,
        strategy_name=strategy_name,
        status="open",
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def close_trade(
    db: Session,
    trade_id: int,
    exit_price: float,
) -> Optional[Trade]:
    """Close a trade and calculate P&L."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if trade:
        trade.exit_price = exit_price
        trade.exit_time = datetime.utcnow()
        trade.status = "closed"

        # Calculate P&L
        if trade.side == "BUY":
            trade.pnl = (exit_price - trade.entry_price) * trade.quantity
        else:  # SELL
            trade.pnl = (trade.entry_price - exit_price) * trade.quantity

        # Calculate P&L %
        if trade.entry_price != 0:
            trade.pnl_percent = (trade.pnl / (trade.entry_price * trade.quantity)) * 100

        db.commit()
        db.refresh(trade)
    return trade


def get_trade(db: Session, trade_id: int) -> Optional[Trade]:
    """Get trade by ID."""
    return db.query(Trade).filter(Trade.id == trade_id).first()


def get_user_trades(db: Session, user_id: int) -> List[Trade]:
    """Get all trades for a user."""
    return db.query(Trade).filter(Trade.user_id == user_id).all()


def get_strategy_trades(db: Session, strategy_id: int) -> List[Trade]:
    """Get all trades for a strategy."""
    return db.query(Trade).filter(Trade.strategy_id == strategy_id).all()


# Position CRUD
def create_or_update_position(
    db: Session,
    user_id: int,
    strategy_id: int,
    symbol: str,
    quantity: float,
    avg_price: float,
    strategy_name: str,
) -> Position:
    """Create or update a position."""
    position = db.query(Position).filter(
        Position.user_id == user_id,
        Position.symbol == symbol,
        Position.strategy_id == strategy_id,
    ).first()

    if position:
        # Update existing position
        position.quantity = quantity
        position.avg_price = avg_price
        position.updated_at = datetime.utcnow()
    else:
        # Create new position
        position = Position(
            user_id=user_id,
            strategy_id=strategy_id,
            symbol=symbol,
            quantity=quantity,
            avg_price=avg_price,
            strategy_name=strategy_name,
        )
        db.add(position)

    db.commit()
    db.refresh(position)
    return position


def get_position(db: Session, position_id: int) -> Optional[Position]:
    """Get position by ID."""
    return db.query(Position).filter(Position.id == position_id).first()


def get_user_positions(db: Session, user_id: int) -> List[Position]:
    """Get all positions for a user."""
    return db.query(Position).filter(Position.user_id == user_id).all()


def delete_position(db: Session, position_id: int) -> bool:
    """Delete a position."""
    position = get_position(db, position_id)
    if position:
        db.delete(position)
        db.commit()
        return True
    return False


# Ledger CRUD
def create_ledger_entry(
    db: Session,
    user_id: int,
    trade_id: int,
    profit: float,
    fee: float,
) -> Ledger:
    """Create a ledger entry for a closed trade."""
    entry = Ledger(
        user_id=user_id,
        trade_id=trade_id,
        profit=profit,
        fee=fee,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    broker_accounts = relationship("BrokerAccount", back_populates="user")
    strategies = relationship("Strategy", back_populates="created_by_user")
    active_strategies = relationship("ActiveStrategy", back_populates="user")
    trades = relationship("Trade", back_populates="user")
    positions = relationship("Position", back_populates="user")


class BrokerAccount(Base):
    __tablename__ = "broker_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    broker_name = Column(String)  # "zerodha"
    api_key = Column(String)
    encrypted_secret = Column(String)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="broker_accounts")


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    entry_logic = Column(JSON)  # Store entry conditions
    exit_logic = Column(JSON)   # Store exit conditions (SL, TP, time-based)
    risk_params = Column(JSON)  # Store risk parameters
    instruments = Column(JSON)  # List of instruments to trade
    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by_user = relationship("User", back_populates="strategies")
    active_instances = relationship("ActiveStrategy", back_populates="strategy")


class ActiveStrategy(Base):
    __tablename__ = "active_strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), index=True)
    status = Column(String, default="running")  # running, paused, stopped
    capital_allocated = Column(Float)
    started_at = Column(DateTime, default=datetime.utcnow)
    stopped_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="active_strategies")
    strategy = relationship("Strategy", back_populates="active_instances")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    symbol = Column(String, index=True)
    side = Column(String)  # BUY or SELL
    quantity = Column(Float)
    entry_price = Column(Float)
    exit_price = Column(Float, nullable=True)
    entry_time = Column(DateTime, default=datetime.utcnow)
    exit_time = Column(DateTime, nullable=True)
    pnl = Column(Float, nullable=True)  # Profit/Loss
    pnl_percent = Column(Float, nullable=True)  # P&L %
    status = Column(String, default="open")  # open, closed
    order_id = Column(String)  # Zerodha order ID
    strategy_name = Column(String)  # Tag for strategy identification
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="trades")


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    symbol = Column(String, index=True)
    quantity = Column(Float)
    avg_price = Column(Float)
    current_price = Column(Float)
    pnl = Column(Float)
    pnl_percent = Column(Float)
    strategy_name = Column(String)  # Tag positions to strategy
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="positions")


class Ledger(Base):
    __tablename__ = "ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    trade_id = Column(Integer, ForeignKey("trades.id"))
    profit = Column(Float)  # Profit from trade
    fee = Column(Float)     # Commission/brokerage
    created_at = Column(DateTime, default=datetime.utcnow)

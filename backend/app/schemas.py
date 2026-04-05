from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any


# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Broker Account Schemas
class BrokerAccountCreate(BaseModel):
    broker_name: str
    api_key: str
    api_secret: str


class BrokerAccountResponse(BaseModel):
    id: int
    user_id: int
    broker_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Strategy Schemas
class StrategyCreate(BaseModel):
    name: str
    description: str
    entry_logic: Dict[str, Any]
    exit_logic: Dict[str, Any]
    risk_params: Dict[str, Any]
    instruments: List[Dict[str, Any]]


class StrategyResponse(BaseModel):
    id: int
    name: str
    description: str
    entry_logic: Dict[str, Any]
    exit_logic: Dict[str, Any]
    risk_params: Dict[str, Any]
    instruments: List[Dict[str, Any]]
    created_by: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Active Strategy Schemas
class ActiveStrategyStart(BaseModel):
    strategy_id: int
    capital_allocated: float


class ActiveStrategyResponse(BaseModel):
    id: int
    user_id: int
    strategy_id: int
    status: str
    capital_allocated: float
    started_at: datetime
    stopped_at: Optional[datetime]

    class Config:
        from_attributes = True


# Trade Schemas
class TradeResponse(BaseModel):
    id: int
    user_id: int
    strategy_id: int
    symbol: str
    side: str
    quantity: float
    entry_price: float
    exit_price: Optional[float]
    entry_time: datetime
    exit_time: Optional[datetime]
    pnl: Optional[float]
    pnl_percent: Optional[float]
    status: str
    strategy_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# Position Schemas
class PositionResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    quantity: float
    avg_price: float
    current_price: float
    pnl: float
    pnl_percent: float
    strategy_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Analytics Schemas
class DailyAnalytics(BaseModel):
    date: datetime
    total_pnl: float
    num_trades: int
    win_rate: float
    by_strategy: Dict[str, Any]


class PortfolioSummary(BaseModel):
    total_pnl: float
    total_positions: int
    total_trades: int
    active_strategies: int
    positions: List[PositionResponse]

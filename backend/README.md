# Algo Trading Platform - Backend

FastAPI backend for the algorithmic trading platform with Zerodha integration.

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Database URL (PostgreSQL)
- Zerodha API credentials
- JWT secret key
- Encryption key

### 3. Setup Database

Make sure PostgreSQL is running, then:

```bash
# The tables will be created automatically on first run
# Or manually run:
alembic upgrade head
```

### 4. Run the Server

```bash
cd /Users/satya/algo-trading-platform/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user details

### Broker Integration
- `GET /api/broker/zerodha/login-url` - Get Zerodha OAuth login URL
- `GET /api/broker/zerodha/callback` - Handle OAuth callback
- `GET /api/broker/zerodha/account` - Get linked broker account
- `DELETE /api/broker/zerodha/disconnect` - Disconnect broker

### Strategies
- `POST /api/strategies` - Create strategy
- `GET /api/strategies` - List all strategies
- `GET /api/strategies/{strategy_id}` - Get specific strategy
- `PUT /api/strategies/{strategy_id}` - Update strategy
- `DELETE /api/strategies/{strategy_id}` - Delete strategy

### Execution
- `POST /api/execution/start` - Start strategy execution
- `POST /api/execution/stop/{active_strategy_id}` - Stop strategy
- `GET /api/execution` - Get all running strategies
- `GET /api/execution/{active_strategy_id}` - Get specific running strategy

### Positions
- `GET /api/positions` - List all open positions
- `GET /api/positions/{position_id}` - Get specific position
- `DELETE /api/positions/{position_id}` - Close position

### Trades
- `GET /api/trades` - List all trades
- `GET /api/trades/strategy/{strategy_id}` - Get trades for strategy
- `GET /api/trades/{trade_id}` - Get specific trade

### Analytics
- `GET /api/analytics/daily` - Get daily P&L summary
- `GET /api/analytics/portfolio-summary` - Get portfolio summary
- `GET /api/analytics/strategy/{strategy_id}` - Get strategy-specific analytics

### WebSocket
- `WS /api/ws?token={token}` - Real-time updates connection

## Strategy Configuration Format

Strategies are defined in JSON/YAML format:

```yaml
name: "Moving Average Crossover"
description: "Entry when SMA20 > SMA50"

instruments:
  - symbol: RELIANCE
    quantity: 1
    market: NSE

entry_logic:
  condition: "sma_20 > sma_50"
  price_type: "market"

exit_logic:
  stop_loss_percent: 2.0
  profit_target_percent: 5.0
  time_based_exit: "16:00"

risk_params:
  max_positions: 5
  position_size_percent: 10.0
```

## Key Features

- ✅ JWT authentication with refresh tokens
- ✅ Zerodha Kite API v3 integration (OAuth2)
- ✅ YAML/JSON strategy configuration
- ✅ Real-time position monitoring
- ✅ P&L tracking and analytics
- ✅ WebSocket for live updates
- ✅ Multi-strategy support
- ✅ Entry/exit condition monitoring
- ✅ Strategy tagging for position identification

## Architecture

```
backend/app/
├── core/              # Configuration, security
├── models/            # SQLAlchemy ORM models
├── database/          # Database setup and CRUD operations
├── api/               # FastAPI route handlers
├── broker/            # Zerodha client wrapper
├── strategy/          # Strategy loading and execution
├── websocket/         # Real-time WebSocket management
└── main.py            # FastAPI app initialization
```

## Notes

- Token expires in 15 minutes (configurable)
- Positions and trades are tagged with strategy name for easy tracking
- Strategy execution runs asynchronously
- WebSocket updates broadcast to all connected clients
- P&L calculations happen in real-time

## Next Steps

1. Setup React/Next.js frontend
2. Implement backtesting engine
3. Add paper trading mode
4. Implement multi-broker support
5. Add email/Telegram alerts

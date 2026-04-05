# Algo Trading Platform - Complete Setup Guide

A full-stack algorithmic trading platform with Zerodha broker integration, real-time monitoring, and strategy execution.

## 🎯 Project Overview

This is a multi-user algorithmic trading platform that enables users to:
- Connect their Zerodha trading accounts
- Select predefined trading strategies
- Execute strategies with real-time monitoring
- Track P&L and analytics
- Control strategies with start/stop functionality

## 📋 Features

### Core Features ✅
- ✅ User authentication (JWT tokens)
- ✅ Zerodha OAuth2 integration
- ✅ Strategy management (YAML/JSON configs)
- ✅ Real-time position monitoring
- ✅ Entry/exit condition evaluation
- ✅ P&L calculation and tracking
- ✅ Strategy tagging for position identification
- ✅ WebSocket real-time updates
- ✅ Trade history and analytics
- ✅ RESTful API endpoints

### Upcoming Features
- Backtesting engine
- Paper trading mode
- Email/Telegram alerts
- Multi-broker support
- Risk management dashboard
- Advanced charts and analytics

## 🏗️ Architecture

### Backend (FastAPI + Python)
```
backend/
├── app/
│   ├── core/           # Configuration, security
│   ├── models/         # SQLAlchemy ORM models
│   ├── database/       # Database setup, CRUD operations
│   ├── api/            # FastAPI route handlers
│   ├── broker/         # Zerodha API client
│   ├── strategy/       # Strategy loading and execution
│   ├── websocket/      # Real-time communication
│   └── main.py         # App initialization
├── requirements.txt    # Python dependencies
└── README.md          # Backend setup guide
```

### Frontend (React + Next.js)
```
frontend/
├── src/
│   ├── pages/         # Next.js pages (routes)
│   ├── components/    # Reusable components
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Zustand state management
│   ├── lib/           # API client and utilities
│   ├── types/         # TypeScript types
│   └── styles/        # Global and component styles
├── package.json       # NPM dependencies
└── README.md         # Frontend setup guide
```

### Database (SQLite/PostgreSQL)
```
Tables:
- users
- broker_accounts
- strategies
- active_strategies
- trades
- positions
- ledger
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+ (or use SQLite for development)

### Backend Setup

1. **Install Python dependencies**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (for development, defaults work fine)
   ```

3. **Run the backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Backend API will be available at: `http://localhost:8000`
   Interactive docs: `http://localhost:8000/docs`

### Frontend Setup

1. **Install Node dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

   Frontend will be available at: `http://localhost:3000`

## 📚 API Documentation

### Base URL
`http://localhost:8000`

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

#### Broker Integration
- `GET /api/broker/zerodha/login-url` - Get Zerodha login URL
- `GET /api/broker/zerodha/account` - Get linked broker account
- `DELETE /api/broker/zerodha/disconnect` - Disconnect broker

#### Strategies
- `GET /api/strategies` - List all strategies
- `POST /api/strategies` - Create strategy
- `GET /api/strategies/{id}` - Get strategy details
- `PUT /api/strategies/{id}` - Update strategy
- `DELETE /api/strategies/{id}` - Delete strategy

#### Execution
- `POST /api/execution/start` - Start strategy execution
- `POST /api/execution/stop/{id}` - Stop strategy
- `GET /api/execution` - Get running strategies

#### Positions & Trades
- `GET /api/positions` - List open positions
- `GET /api/trades` - List trade history
- `GET /api/analytics/portfolio-summary` - Portfolio stats
- `GET /api/analytics/daily?date=YYYY-MM-DD` - Daily P&L

#### Real-Time
- `WS /api/ws?token={token}` - WebSocket for live updates

Full API docs available at: `http://localhost:8000/docs`

## 📊 Strategy Configuration

Strategies are defined in YAML/JSON format:

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

Sample strategies are in `database/strategies/`

## 🔐 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- API key encryption for broker credentials
- User isolation on all endpoints
- CORS protection
- Rate limiting ready

## 📈 Real-Time Features

### WebSocket Messages
```json
{
  "type": "positions_update",
  "timestamp": "2024-01-15T10:30:00",
  "total_pnl": 5000.50,
  "positions": [...]
}
```

### Position Tagging
All positions are automatically tagged with the strategy name for easy identification:
```
Symbol: RELIANCE | Strategy: Moving Average Crossover | P&L: ₹500 (2.5%)
```

## 🧪 Testing

### API Testing
Use the built-in Swagger UI:
- Go to `http://localhost:8000/docs`
- Try endpoints interactively

### Manual Testing Flow
1. Register at `localhost:3000/register`
2. Login at `localhost:3000/login`
3. Go to strategies page
4. Select a strategy and allocate capital
5. Monitor in dashboard for real-time updates

## 📦 Deployment

### Backend (Docker)
```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

### Frontend (Vercel/Netlify)
```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### Backend Connection Failed
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Verify CORS is enabled in FastAPI

### Database Errors
- For SQLite: Database file should auto-create
- For PostgreSQL: Ensure DB is running and connection string is correct
- Run `alembic upgrade head` if using migrations

### Token Expiration
- Tokens auto-refresh in the background
- If issues persist, clear localStorage and re-login

## 📝 Example Scenarios

### Scenario 1: Start a Momentum Strategy
1. User logs in
2. Views available strategies on `/strategies`
3. Selects "Moving Average Crossover"
4. Allocates ₹50,000 capital
5. Clicks "Start Strategy"
6. Strategy monitors entry condition (SMA20 > SMA50)
7. When triggered, places order via Zerodha
8. Position appears on dashboard tagged with "Moving Average Crossover"
9. Strategy monitors exit conditions (SL: 2%, TP: 5%, EOD exit)
10. When exit triggered, closes position and records P&L

### Scenario 2: Monitor Multiple Strategies
1. User starts 3 different strategies with different capital allocation
2. Dashboard shows all 3 running with real-time P&L
3. User can stop any strategy individually
4. All positions are identified by strategy name
5. Analytics show performance per strategy

## 🔗 Integration Points

### Zerodha API v3
- OAuth2 authentication
- Order placement and cancellation
- Position fetching
- Quote/price data
- Account balance

### Database
- User profiles and authentication
- Broker credentials (encrypted)
- Strategy definitions
- Trade history and ledger
- Position tracking

## 📞 Support & Development

For issues or feature requests, check:
- Backend logs: Terminal where FastAPI is running
- Frontend logs: Browser console (F12)
- API errors: Response in Network tab

## 🎓 Learning Resources

- [Zerodha API Docs](https://kite.trade/docs/connect/v3/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Zustand State Management](https://github.com/pmndrs/zustand)

## 📄 License

MIT

## 🙏 Acknowledgments

- Zerodha for excellent trading APIs
- FastAPI for a modern Python framework
- Next.js for seamless React development
- All open-source contributors

---

**Ready to start trading?**

1. Complete the backend setup
2. Complete the frontend setup
3. Navigate to `localhost:3000`
4. Create your account
5. Link Zerodha account
6. Start making money! 🚀

For detailed setup, see:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

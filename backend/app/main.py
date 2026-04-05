from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import engine, Base
from app.core.config import settings
from app.api import auth, broker, strategies, positions, trades, execution, analytics, websocket
# Import all models to register them with Base
from app.models import User, BrokerAccount, Strategy, Trade, Position, ActiveStrategy, Ledger
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Algorithmic Trading Platform with Zerodha Integration",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(broker.router)
app.include_router(strategies.router)
app.include_router(positions.router)
app.include_router(trades.router)
app.include_router(execution.router)
app.include_router(analytics.router)
app.include_router(websocket.router)


# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

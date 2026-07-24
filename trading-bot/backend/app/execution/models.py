from sqlalchemy import Column, Integer, Float, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False) # LONG, SHORT
    order_type = Column(String(20), nullable=False) # MARKET, LIMIT
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True) # None for MARKET
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    status = Column(String(20), default="NEW") # NEW, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Position(Base):
    __tablename__ = "positions"

    id = Column(String(36), primary_key=True, index=True)
    account_mode = Column(String(10), default="DEMO") # DEMO, LIVE
    broker = Column(String(20), default="CTRADER")
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False) # LONG, SHORT
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    current_mark_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    ai_confidence_score = Column(Float, nullable=True)
    ai_reasoning = Column(String, nullable=True)
    status = Column(String(20), default="OPEN") # OPEN, CLOSED, CANCELLED
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), nullable=False)
    timeframe = Column(String(10), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    initial_balance = Column(Float, nullable=False)
    final_balance = Column(Float, nullable=False)
    total_return_pct = Column(Float, nullable=False)
    sharpe_ratio = Column(Float, nullable=True)
    max_drawdown_pct = Column(Float, nullable=True)
    win_rate_pct = Column(Float, nullable=True)
    profit_factor = Column(Float, nullable=True)
    strategy_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trades = relationship("BacktestTrade", back_populates="run")

class BacktestTrade(Base):
    __tablename__ = "backtest_trades"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("backtest_runs.id"), nullable=False)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)
    entry_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    size = Column(Float, nullable=False)
    fee = Column(Float, default=0.0)
    slippage = Column(Float, default=0.0)
    net_pnl = Column(Float, nullable=False)
    
    run = relationship("BacktestRun", back_populates="trades")

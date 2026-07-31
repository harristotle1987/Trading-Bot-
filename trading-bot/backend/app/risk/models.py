from sqlalchemy import Column, Integer, Float, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class RiskSetting(Base):
    __tablename__ = "risk_settings"

    id = Column(Integer, primary_key=True, index=True)
    max_concurrent_trades = Column(Integer, default=3, nullable=False)
    max_daily_drawdown_pct = Column(Float, default=0.05, nullable=False)
    max_spread_pct = Column(Float, default=0.001, nullable=False)
    default_risk_pct = Column(Float, default=0.01, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiskAuditLog(Base):
    __tablename__ = "risk_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    action = Column(String(50), nullable=False)  # e.g., "EVALUATE_ORDER", "KILL_SWITCH_ENGAGED"
    status = Column(String(20), nullable=False)  # e.g., "PASSED", "REJECTED"
    reason = Column(String(255), nullable=True)  # Reason for rejection
    payload = Column(JSON, nullable=True)        # The evaluated payload/context

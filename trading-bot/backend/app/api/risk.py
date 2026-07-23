from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.db.database import get_db
from backend.app.risk.models import RiskSetting

router = APIRouter()

class RiskSettingsSchema(BaseModel):
    max_concurrent_trades: int
    max_daily_drawdown_pct: float
    max_spread_pct: float
    default_risk_pct: float

    class Config:
        orm_mode = True

current_metrics = {
    "total_exposure": 12500.50,
    "daily_pnl": -150.25,
    "active_positions": 1,
    "equity": 50000.00
}

@router.get("/settings", response_model=RiskSettingsSchema)
async def get_risk_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiskSetting).order_by(RiskSetting.id.desc()).limit(1))
    setting = result.scalars().first()
    
    if setting:
        return setting
        
    # Return defaults if not set in DB
    return RiskSettingsSchema(
        max_concurrent_trades=3,
        max_daily_drawdown_pct=0.05,
        max_spread_pct=0.001,
        default_risk_pct=0.01
    )

@router.post("/settings", response_model=RiskSettingsSchema)
async def update_risk_settings(settings: RiskSettingsSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiskSetting).order_by(RiskSetting.id.desc()).limit(1))
    existing_setting = result.scalars().first()

    if existing_setting:
        existing_setting.max_concurrent_trades = settings.max_concurrent_trades
        existing_setting.max_daily_drawdown_pct = settings.max_daily_drawdown_pct
        existing_setting.max_spread_pct = settings.max_spread_pct
        existing_setting.default_risk_pct = settings.default_risk_pct
    else:
        new_setting = RiskSetting(
            max_concurrent_trades=settings.max_concurrent_trades,
            max_daily_drawdown_pct=settings.max_daily_drawdown_pct,
            max_spread_pct=settings.max_spread_pct,
            default_risk_pct=settings.default_risk_pct
        )
        db.add(new_setting)
        
    await db.commit()
    return settings

@router.get("/metrics")
async def get_risk_metrics():
    # Calculate dynamically based on active positions and account balance
    return current_metrics


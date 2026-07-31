from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio

router = APIRouter()

class BacktestRequest(BaseModel):
    symbol: str
    timeframe: str
    start_time: str
    end_time: str
    initial_balance: float
    strategy_config: dict

# Mock persistence in-memory for immediate return
runs_db = []

@router.post("/run")
async def run_backtest(req: BacktestRequest):
    # Mocking backtest execution
    run_id = len(runs_db) + 1
    
    # Generate realistic fake equity curve for UI dev
    initial = req.initial_balance
    equity_curve = []
    
    import math
    from datetime import datetime, timedelta
    base_date = datetime(2023, 1, 1)
    for i in range(100):
        # random walk with an upward drift
        progress = i / 100
        val = initial * (1 + (math.sin(i * 0.2) * 0.05) + (progress * 0.15))
        d = base_date + timedelta(days=i)
        equity_curve.append({
            "time": d.isoformat() + "Z", 
            "equity": val,
            "drawdown": (val - (initial * 1.2)) / (initial * 1.2) if val < initial * 1.2 else 0
        })

    report = {
        "id": run_id,
        "symbol": req.symbol,
        "timeframe": req.timeframe,
        "start_time": req.start_time,
        "end_time": req.end_time,
        "initial_balance": req.initial_balance,
        "final_balance": req.initial_balance * 1.15,
        "total_return_pct": 15.0,
        "sharpe_ratio": 1.8,
        "max_drawdown_pct": -4.2,
        "win_rate_pct": 55.5,
        "profit_factor": 1.4,
        "strategy_config": req.strategy_config,
        "created_at": datetime.utcnow().isoformat(),
        "equity_curve": equity_curve,
        "trades": [
             {"id": 1, "symbol": req.symbol, "side": "LONG", "entry_price": 50000, "exit_price": 52000, "net_pnl": 200, "entry_time": "2023-01-01T00:00:00Z", "exit_time": "2023-01-02T00:00:00Z"},
             {"id": 2, "symbol": req.symbol, "side": "SHORT", "entry_price": 52000, "exit_price": 51000, "net_pnl": 100, "entry_time": "2023-01-03T00:00:00Z", "exit_time": "2023-01-04T00:00:00Z"},
        ]
    }
    
    runs_db.append(report)
    return {"status": "success", "report": report}

@router.get("/reports")
async def get_reports():
    summaries = [
        {
            k: v for k, v in run.items() if k not in ["equity_curve", "trades"]
        } for run in runs_db
    ]
    return {"status": "success", "reports": summaries}

@router.get("/reports/{report_id}")
async def get_report(report_id: int):
    for run in runs_db:
        if run["id"] == report_id:
            return {"status": "success", "report": run}
    raise HTTPException(status_code=404, detail="Report not found")

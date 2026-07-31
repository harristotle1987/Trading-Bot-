from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from backend.app.backtest.models import BacktestRun, BacktestTrade

async def get_backtest_runs(session: AsyncSession):
    result = await session.execute(select(BacktestRun).order_by(BacktestRun.created_at.desc()))
    return result.scalars().all()

async def get_backtest_run_by_id(session: AsyncSession, run_id: int):
    result = await session.execute(
        select(BacktestRun)
        .where(BacktestRun.id == run_id)
        .options(selectinload(BacktestRun.trades))
    )
    return result.scalars().first()

async def create_backtest_run(session: AsyncSession, run_data: dict, trades_data: list):
    run = BacktestRun(**run_data)
    session.add(run)
    await session.commit()
    await session.refresh(run)

    for trade_data in trades_data:
        trade = BacktestTrade(**trade_data, run_id=run.id)
        session.add(trade)
    
    await session.commit()
    return run

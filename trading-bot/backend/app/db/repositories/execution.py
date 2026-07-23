from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.execution.models import Order, Position

async def get_orders(session: AsyncSession):
    result = await session.execute(select(Order).order_by(Order.created_at.desc()))
    return result.scalars().all()

async def get_positions(session: AsyncSession):
    result = await session.execute(select(Position).order_by(Position.created_at.desc()))
    return result.scalars().all()

async def create_order(session: AsyncSession, order_data: dict):
    order = Order(**order_data)
    session.add(order)
    await session.commit()
    await session.refresh(order)
    return order

async def create_position(session: AsyncSession, position_data: dict):
    position = Position(**position_data)
    session.add(position)
    await session.commit()
    await session.refresh(position)
    return position

async def update_position(session: AsyncSession, position_id: int, updates: dict):
    result = await session.execute(select(Position).where(Position.id == position_id))
    position = result.scalars().first()
    if position:
        for k, v in updates.items():
            setattr(position, k, v)
        await session.commit()
        await session.refresh(position)
    return position

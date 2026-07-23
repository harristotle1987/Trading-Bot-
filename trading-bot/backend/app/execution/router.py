from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.execution.tracker import tracker_instance

router = APIRouter()

class OrderRequest(BaseModel):
    symbol: str
    side: str
    order_type: str
    quantity: float
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    mode: str = "PAPER_SIMULATED" # PAPER_SIMULATED or BYBIT_TESTNET

@router.post("/order/create")
async def create_order(req: OrderRequest):
    if req.mode == "PAPER_SIMULATED":
        # Create order in tracker
        order = tracker_instance.create_order(
            symbol=req.symbol,
            side=req.side,
            order_type=req.order_type,
            quantity=req.quantity,
            price=req.price,
            sl=req.stop_loss,
            tp=req.take_profit
        )
        
        # Simulate immediate fill for MARKET orders
        if req.order_type == "MARKET":
            fill_price = req.price or 50000.00 # Mock price if None
            tracker_instance.fill_order(order["id"], fill_price)
            
        return {"status": "success", "order": order}
    elif req.mode == "BYBIT_TESTNET":
        # Placeholder for real Bybit API Integration
        raise HTTPException(status_code=501, detail="Bybit Testnet execution not fully implemented yet.")
    else:
        raise HTTPException(status_code=400, detail="Invalid mode.")

@router.post("/order/cancel/{order_id}")
async def cancel_order(order_id: int):
    success = tracker_instance.cancel_order(order_id)
    if success:
        return {"status": "success", "message": f"Order {order_id} cancelled."}
    raise HTTPException(status_code=404, detail="Order not found or already closed.")

@router.post("/position/close/{symbol}")
async def close_position(symbol: str):
    # Simulated current price fetch
    exit_price = 50000.00 
    pos = tracker_instance.close_position(symbol, exit_price)
    if pos:
        return {"status": "success", "position": pos}
    raise HTTPException(status_code=404, detail="Active position not found.")

@router.get("/positions")
async def get_positions():
    return {"status": "success", "positions": tracker_instance.get_active_positions()}

@router.get("/orders")
async def get_orders():
    return {"status": "success", "orders": tracker_instance.get_orders()}

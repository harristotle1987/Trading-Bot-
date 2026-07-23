from typing import Dict, Any, List
from datetime import datetime

class ExecutionTracker:
    def __init__(self):
        # In-memory store for active tracking (mocking DB for rapid simulation)
        self.active_positions: Dict[str, Dict[str, Any]] = {}
        self.orders: List[Dict[str, Any]] = []
        self.next_order_id = 1
        self.next_position_id = 1

    def handle_market_tick(self, symbol: str, bid: float, ask: float):
        """Update positions on new market data."""
        if symbol in self.active_positions:
            pos = self.active_positions[symbol]
            mark_price = (bid + ask) / 2
            pos["mark_price"] = mark_price
            
            # Calculate uPnL
            if pos["side"] == "LONG":
                pos["unrealized_pnl"] = (mark_price - pos["entry_price"]) * pos["size"]
            else:
                pos["unrealized_pnl"] = (pos["entry_price"] - mark_price) * pos["size"]
                
            # Check Stop Loss / Take Profit
            if pos["stop_loss"] and ((pos["side"] == "LONG" and mark_price <= pos["stop_loss"]) or (pos["side"] == "SHORT" and mark_price >= pos["stop_loss"])):
                self.close_position(symbol, mark_price, "STOP_LOSS")
            elif pos["take_profit"] and ((pos["side"] == "LONG" and mark_price >= pos["take_profit"]) or (pos["side"] == "SHORT" and mark_price <= pos["take_profit"])):
                self.close_position(symbol, mark_price, "TAKE_PROFIT")

    def create_order(self, symbol: str, side: str, order_type: str, quantity: float, price: float = None, sl: float = None, tp: float = None):
        order = {
            "id": self.next_order_id,
            "symbol": symbol,
            "side": side,
            "order_type": order_type,
            "quantity": quantity,
            "price": price,
            "stop_loss": sl,
            "take_profit": tp,
            "status": "NEW",
            "created_at": datetime.utcnow().isoformat()
        }
        self.orders.append(order)
        self.next_order_id += 1
        return order

    def fill_order(self, order_id: int, fill_price: float):
        for order in self.orders:
            if order["id"] == order_id:
                order["status"] = "FILLED"
                
                # Create or update position
                symbol = order["symbol"]
                if symbol in self.active_positions:
                    # Simplified: just update size and average entry (ignoring complex position netting)
                    pos = self.active_positions[symbol]
                    total_value = (pos["size"] * pos["entry_price"]) + (order["quantity"] * fill_price)
                    pos["size"] += order["quantity"]
                    pos["entry_price"] = total_value / pos["size"]
                    pos["stop_loss"] = order["stop_loss"] or pos["stop_loss"]
                    pos["take_profit"] = order["take_profit"] or pos["take_profit"]
                else:
                    self.active_positions[symbol] = {
                        "id": self.next_position_id,
                        "symbol": symbol,
                        "side": order["side"],
                        "size": order["quantity"],
                        "entry_price": fill_price,
                        "mark_price": fill_price,
                        "stop_loss": order["stop_loss"],
                        "take_profit": order["take_profit"],
                        "unrealized_pnl": 0.0,
                        "realized_pnl": 0.0,
                        "status": "OPEN"
                    }
                    self.next_position_id += 1
                return order
        return None

    def cancel_order(self, order_id: int):
        for order in self.orders:
            if order["id"] == order_id and order["status"] in ["NEW", "PARTIALLY_FILLED"]:
                order["status"] = "CANCELLED"
                return True
        return False

    def close_position(self, symbol: str, exit_price: float, reason: str = "MANUAL"):
        if symbol in self.active_positions:
            pos = self.active_positions.pop(symbol)
            pos["status"] = "CLOSED"
            # Calculate final rPnL
            if pos["side"] == "LONG":
                pos["realized_pnl"] = (exit_price - pos["entry_price"]) * pos["size"]
            else:
                pos["realized_pnl"] = (pos["entry_price"] - exit_price) * pos["size"]
            return pos
        return None

    def get_active_positions(self):
        return list(self.active_positions.values())

    def get_orders(self):
        return self.orders
        
tracker_instance = ExecutionTracker()

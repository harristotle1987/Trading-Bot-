import math
from typing import Dict, Any, Optional

class PositionSizer:
    def __init__(self, default_risk_pct: float = 0.01):
        """
        Initializes the Position Sizer.
        :param default_risk_pct: The default percentage of account equity to risk per trade (e.g., 0.01 for 1%).
        """
        self.default_risk_pct = default_risk_pct

    def calculate_position(self, signal: Dict[str, Any], equity: float, atr: float,
                           min_order_size: float = 0.001, step_size: float = 0.001) -> Optional[Dict[str, float]]:
        """
        Calculates position size and SL/TP bounds based on ATR and equity risk.
        
        :param signal: The signal data containing 'entry_price' and 'side' ('LONG' or 'SHORT')
        :param equity: Total account equity
        :param atr: Average True Range for volatility adjustment
        :param min_order_size: Exchange minimum order size
        :param step_size: Exchange step size for quantity
        :return: Dict containing exact quantity, SL, and TP, or None if invalid.
        """
        entry_price = signal.get("entry_price")
        side = signal.get("side", "").upper()

        if not entry_price or entry_price <= 0 or atr <= 0 or equity <= 0:
            return None

        # Calculate SL/TP bounds (ATR Multipliers: 1.5 for SL, 3.0 for TP)
        sl_distance = 1.5 * atr
        tp_distance = 3.0 * atr

        if side == "LONG":
            stop_loss = entry_price - sl_distance
            take_profit = entry_price + tp_distance
        elif side == "SHORT":
            stop_loss = entry_price + sl_distance
            take_profit = entry_price - tp_distance
        else:
            return None

        # Calculate exact position quantity based on risk amount
        risk_amount = equity * self.default_risk_pct
        risk_per_unit = abs(entry_price - stop_loss)
        
        if risk_per_unit == 0:
            return None
            
        raw_quantity = risk_amount / risk_per_unit

        # Adjust quantity to comply with exchange step_size and min_order_size
        adjusted_qty = math.floor(raw_quantity / step_size) * step_size
        adjusted_qty = round(adjusted_qty, 8) # Precision fix

        if adjusted_qty < min_order_size:
            return None # Trade too small for exchange rules

        return {
            "quantity": adjusted_qty,
            "stop_loss": round(stop_loss, 4),
            "take_profit": round(take_profit, 4),
            "risk_amount": round(risk_amount, 2)
        }

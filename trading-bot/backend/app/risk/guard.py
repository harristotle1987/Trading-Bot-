from typing import Dict, Any, List

class RiskGuard:
    def __init__(self, max_concurrent_trades: int = 3, max_daily_drawdown_pct: float = 0.05, max_spread_pct: float = 0.001):
        """
        Circuit Breakers & Risk Checks.
        """
        self.max_concurrent_trades = max_concurrent_trades
        self.max_daily_drawdown_pct = max_daily_drawdown_pct
        self.max_spread_pct = max_spread_pct

    def evaluate_order(self, 
                       order_payload: Dict[str, Any], 
                       active_positions: int, 
                       daily_pnl: float, 
                       equity: float, 
                       best_bid: float, 
                       best_ask: float) -> bool:
        """
        Evaluates an order against circuit breakers.
        Returns True if the order passes all risk checks, False otherwise.
        """
        # 1. Max Concurrent Trades
        if active_positions >= self.max_concurrent_trades:
            print(f"[RiskGuard] REJECTED: Max concurrent trades reached ({active_positions}/{self.max_concurrent_trades})")
            return False

        # 2. Max Daily Drawdown
        if equity > 0:
            current_drawdown_pct = abs(daily_pnl) / equity if daily_pnl < 0 else 0
            if current_drawdown_pct >= self.max_daily_drawdown_pct:
                print(f"[RiskGuard] REJECTED: Max daily drawdown exceeded ({current_drawdown_pct:.2%} >= {self.max_daily_drawdown_pct:.2%})")
                return False

        # 3. Spread & Volatility Filter
        if best_ask > 0 and best_bid > 0:
            spread_pct = (best_ask - best_bid) / best_bid
            if spread_pct > self.max_spread_pct:
                print(f"[RiskGuard] REJECTED: Spread too wide ({spread_pct:.4%} > {self.max_spread_pct:.4%})")
                return False

        return True

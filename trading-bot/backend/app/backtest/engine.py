import pandas as pd
import numpy as np

class BacktestEngine:
    def __init__(self, initial_balance=10000.0, maker_fee=0.0002, taker_fee=0.00055, slippage_pct=0.0005):
        self.initial_balance = initial_balance
        self.maker_fee = maker_fee
        self.taker_fee = taker_fee
        self.slippage_pct = slippage_pct

    def run_event_driven(self, historical_data: pd.DataFrame, strategy_func):
        """
        Processes historical candles bar-by-bar to eliminate look-ahead bias.
        """
        balance = self.initial_balance
        positions = []
        trades = []
        equity_curve = []

        for i in range(1, len(historical_data)):
            # Strategy computes signal strictly on t-1 data
            signal = strategy_func(historical_data.iloc[:i])
            
            current_bar = historical_data.iloc[i]
            
            # Simple execution logic
            if signal == 'LONG' and not positions:
                entry_price = current_bar['open'] * (1 + self.slippage_pct)
                size = (balance * 0.95) / entry_price
                fee = size * entry_price * self.taker_fee
                balance -= fee
                positions.append({'side': 'LONG', 'entry_price': entry_price, 'size': size, 'entry_time': current_bar['time']})
            elif signal == 'CLOSE' and positions:
                pos = positions.pop()
                exit_price = current_bar['open'] * (1 - self.slippage_pct)
                fee = pos['size'] * exit_price * self.taker_fee
                pnl = (exit_price - pos['entry_price']) * pos['size'] - fee
                balance += pos['size'] * exit_price + pnl
                trades.append({
                    'side': pos['side'], 'entry_price': pos['entry_price'], 'exit_price': exit_price,
                    'size': pos['size'], 'net_pnl': pnl, 'fee': fee, 'entry_time': pos['entry_time'],
                    'exit_time': current_bar['time']
                })

            equity_curve.append({'time': current_bar['time'], 'equity': balance})

        return trades, equity_curve

    def run_vectorized_sweep(self, data: pd.DataFrame, params_grid):
        """
        Fast vectorized grid-search mode.
        """
        results = []
        for params in params_grid:
            # Vectorized indicator calc
            data['fast'] = data['close'].ewm(span=params['fast_ema']).mean()
            data['slow'] = data['close'].ewm(span=params['slow_ema']).mean()
            data['signal'] = np.where(data['fast'] > data['slow'], 1, 0)
            data['returns'] = data['close'].pct_change()
            data['strategy_returns'] = data['signal'].shift(1) * data['returns']
            
            total_return = (1 + data['strategy_returns']).prod() - 1
            results.append({'params': params, 'total_return': total_return})
            
        return sorted(results, key=lambda x: x['total_return'], reverse=True)

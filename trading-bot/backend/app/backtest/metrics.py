import pandas as pd
import numpy as np

def calculate_metrics(equity_curve: list, trades: list):
    if not equity_curve:
        return {}

    df = pd.DataFrame(equity_curve)
    df['returns'] = df['equity'].pct_change()
    
    total_return = (df['equity'].iloc[-1] / df['equity'].iloc[0]) - 1
    
    # CAGR
    years = (pd.to_datetime(df['time'].iloc[-1]) - pd.to_datetime(df['time'].iloc[0])).days / 365.25
    cagr = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0

    # Sharpe (assuming risk-free rate = 0)
    sharpe = np.sqrt(365) * df['returns'].mean() / df['returns'].std() if df['returns'].std() != 0 else 0
    
    # Sortino
    downside_returns = df[df['returns'] < 0]['returns']
    sortino = np.sqrt(365) * df['returns'].mean() / downside_returns.std() if downside_returns.std() != 0 else 0

    # Max Drawdown
    df['cummax'] = df['equity'].cummax()
    df['drawdown'] = (df['equity'] - df['cummax']) / df['cummax']
    max_drawdown = df['drawdown'].min()

    # Trade stats
    if trades:
        win_trades = [t for t in trades if t['net_pnl'] > 0]
        win_rate = len(win_trades) / len(trades)
        gross_profit = sum(t['net_pnl'] for t in win_trades)
        gross_loss = abs(sum(t['net_pnl'] for t in trades if t['net_pnl'] <= 0))
        profit_factor = gross_profit / gross_loss if gross_loss != 0 else float('inf')
        expectancy = sum(t['net_pnl'] for t in trades) / len(trades)
    else:
        win_rate = 0
        profit_factor = 0
        expectancy = 0

    return {
        'total_return_pct': total_return * 100,
        'cagr_pct': cagr * 100,
        'sharpe_ratio': sharpe,
        'sortino_ratio': sortino,
        'max_drawdown_pct': max_drawdown * 100,
        'win_rate_pct': win_rate * 100,
        'profit_factor': profit_factor,
        'expectancy': expectancy,
        'total_trades': len(trades)
    }

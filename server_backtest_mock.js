
  let backtestReports = [];
  
  app.post("/api/backtest/run", express.json(), (req, res) => {
    const run_id = backtestReports.length + 1;
    const initial = req.body.initial_balance || 10000;
    
    let equity_curve = [];
    for (let i = 0; i < 100; i++) {
        let progress = i / 100;
        let val = initial * (1 + (Math.sin(i * 0.2) * 0.05) + (progress * 0.15));
        equity_curve.push({
            time: `2023-01-${(1 + (i % 28)).toString().padStart(2, '0')}T00:00:00Z`, 
            equity: val,
            drawdown: val < initial * 1.2 ? ((val - (initial * 1.2)) / (initial * 1.2)) * 100 : 0
        });
    }

    const report = {
        id: run_id,
        symbol: req.body.symbol,
        timeframe: req.body.timeframe,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        initial_balance: initial,
        final_balance: initial * 1.15,
        total_return_pct: 15.0,
        sharpe_ratio: 1.8,
        max_drawdown_pct: -4.2,
        win_rate_pct: 55.5,
        profit_factor: 1.4,
        strategy_config: req.body.strategy_config,
        created_at: new Date().toISOString(),
        equity_curve: equity_curve,
        trades: [
             {id: 1, symbol: req.body.symbol, side: "LONG", entry_price: 50000, exit_price: 52000, net_pnl: 200, entry_time: "2023-01-01T00:00:00Z", exit_time: "2023-01-02T00:00:00Z"},
             {id: 2, symbol: req.body.symbol, side: "SHORT", entry_price: 52000, exit_price: 51000, net_pnl: 100, entry_time: "2023-01-03T00:00:00Z", exit_time: "2023-01-04T00:00:00Z"},
        ]
    };
    backtestReports.push(report);
    res.json({ status: "success", report });
  });

  app.get("/api/backtest/reports", (req, res) => {
    const summaries = backtestReports.map(r => {
        const { equity_curve, trades, ...rest } = r;
        return rest;
    });
    res.json({ status: "success", reports: summaries });
  });

  app.get("/api/backtest/reports/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const report = backtestReports.find(r => r.id === id);
    if (report) {
        res.json({ status: "success", report });
    } else {
        res.status(404).json({ detail: "Report not found" });
    }
  });


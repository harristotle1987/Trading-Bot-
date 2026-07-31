import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    try {
        const mode = req.query.mode || "DEMO";
        
        // In a serverless architecture, you might want to fetch this from Firestore
        // rather than having hardcoded sample data.
        const sample_recommendations = [
            {
                symbol: "SOLUSDT",
                category: "CRYPTO",
                directional_bias: "STRONG BUY",
                win_rate_probability: 88.5,
                timeframe: "15m",
                reasoning: "High institutional volume confluence with favorable macro news trajectory.",
                suggested_entry: 142.50,
                suggested_sl: 139.80,
                suggested_tp: 148.00
            },
            {
                symbol: "EURUSD",
                category: "FOREX",
                directional_bias: "STRONG SELL",
                win_rate_probability: 84.2,
                timeframe: "15m",
                reasoning: "Rejection at 1.0880 resistance band + MACD bearish divergence, NIM sentiment confirms.",
                suggested_entry: 1.0850,
                suggested_sl: 1.0890,
                suggested_tp: 1.0770
            },
            {
                symbol: "ETHUSDT",
                category: "CRYPTO",
                directional_bias: "BUY",
                win_rate_probability: 82.1,
                timeframe: "15m",
                reasoning: "Holding 200 EMA support + Positive Sentiment Score (+0.45), backed by Finnhub.",
                suggested_entry: 3450.00,
                suggested_sl: 3390.00,
                suggested_tp: 3580.00
            },
            {
                symbol: "DOTUSDT",
                category: "CRYPTO",
                directional_bias: "STRONG BUY",
                win_rate_probability: 89.2,
                timeframe: "1h",
                reasoning: "Multi-timeframe (15m, 1h) accumulation + AI score 92.4, strong structural base.",
                suggested_entry: 7.20,
                suggested_sl: 6.85,
                suggested_tp: 8.50
            }
        ];
        
        res.json({
            timestamp: new Date().toISOString(),
            active_mode: (mode as string).toUpperCase(),
            recommended_pairs: sample_recommendations
        });
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "Failed to scan workspace", details });
    }
}

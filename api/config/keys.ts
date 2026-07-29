import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    res.json({
        nvidia: !!process.env.NVIDIA_API_KEY,
        bybit: !!(process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET),
        polygon: !!process.env.POLYGON_API_KEY,
        finnhub: !!process.env.FINNHUB_API_KEY,
        ctrader: !!(process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET),
        ctrader_needs_auth: !!(process.env.CTRADER_CLIENT_ID && process.env.CTRADER_CLIENT_SECRET && !process.env.CTRADER_ACCESS_TOKEN)
    });
  } else if (req.method === 'POST') {
    // In a real serverless app, you'd store this in Firestore
    res.status(200).json({ status: "success", message: "Configuration update needs Firestore persistence" });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

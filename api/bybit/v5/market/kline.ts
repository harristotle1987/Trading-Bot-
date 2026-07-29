import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    // Implement Bybit API call here or fetch from Firestore
    res.json({ result: "kline data" });
}

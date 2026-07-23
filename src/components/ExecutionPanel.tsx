"use client";
import React, { useState, useEffect } from 'react';

export default function ExecutionPanel() {
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchState = async () => {
    try {
      const posRes = await fetch('/api/execution/positions', { headers: { 'Accept': 'application/json' } });
      const posData = await posRes.json();
      if (posData.positions) setPositions(posData.positions);

      const ordRes = await fetch('/api/execution/orders', { headers: { 'Accept': 'application/json' } });
      const ordData = await ordRes.json();
      if (ordData.orders) setOrders(ordData.orders);
    } catch (err) {
      if (err instanceof TypeError) { console.warn("Execution API offline"); } else { console.error("Failed to fetch execution state", err); }
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000); // Poll every 3 seconds for mock
    return () => clearInterval(interval);
  }, []);

  const handleClosePosition = async (symbol: string) => {
    setLoading(true);
    try {
      await fetch(`/api/execution/position/close/${symbol}`, { method: 'POST', headers: { 'Accept': 'application/json' } });
      await fetchState();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCancelOrder = async (id: number) => {
    setLoading(true);
    try {
      await fetch(`/api/execution/order/cancel/${id}`, { method: 'POST', headers: { 'Accept': 'application/json' } });
      await fetchState();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const mockCreateOrder = async () => {
    setLoading(true);
    try {
      await fetch('/api/execution/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          symbol: "BTCUSDT",
          side: "LONG",
          order_type: "MARKET",
          quantity: 0.1,
          price: 50000.00,
          stop_loss: 49000.00,
          take_profit: 52000.00,
          mode: "PAPER_SIMULATED"
        })
      });
      await fetchState();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-[#0B0C10] text-[#C5C6C7] font-mono rounded-lg border-4 border-[#1F2833] max-w-6xl mx-auto shadow-2xl mt-6">
      <div className="flex justify-between items-center mb-6 border-b-2 border-[#1F2833] pb-4">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Execution & Positions</h2>
        <div className="flex gap-4">
            <button 
                onClick={mockCreateOrder}
                disabled={loading}
                className="px-4 py-2 font-bold uppercase tracking-wider text-[#0B0C10] bg-[#66FCF1] hover:bg-[#45A29E] transition-all rounded"
            >
                [Test] Buy 0.1 BTC
            </button>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 uppercase">Active Positions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F2833] text-[#45A29E] uppercase text-sm">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Entry Px</th>
                <th className="py-3 px-4">Mark Px</th>
                <th className="py-3 px-4">uPnL</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center text-[#838C9C] italic">No active positions</td></tr>
              ) : positions.map((pos, idx) => (
                <tr key={idx} className="border-b border-[#1F2833] hover:bg-[#1F2833] transition-colors">
                  <td className="py-3 px-4 text-white font-bold">{pos.symbol}</td>
                  <td className={`py-3 px-4 font-bold ${pos.side === 'LONG' ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>{pos.side}</td>
                  <td className="py-3 px-4 text-white">{pos.size}</td>
                  <td className="py-3 px-4 text-white">${pos.entry_price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-white">${pos.mark_price.toFixed(2)}</td>
                  <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded font-bold ${pos.unrealized_pnl >= 0 ? 'bg-[#00E676] text-[#0B0C10]' : 'bg-[#FF1744] text-white'}`}>
                        ${pos.unrealized_pnl.toFixed(2)}
                      </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => handleClosePosition(pos.symbol)}
                      disabled={loading}
                      className="px-3 py-1 font-bold text-xs uppercase text-white bg-transparent border border-[#FF1744] hover:bg-[#FF1744] rounded transition-colors"
                    >
                      Close Market
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-4 uppercase">Order History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F2833] text-[#45A29E] uppercase text-sm">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center text-[#838C9C] italic">No orders found</td></tr>
              ) : [...orders].reverse().map((order, idx) => (
                <tr key={idx} className="border-b border-[#1F2833] hover:bg-[#1F2833] transition-colors">
                  <td className="py-3 px-4 text-white">#{order.id}</td>
                  <td className="py-3 px-4 text-white font-bold">{order.symbol}</td>
                  <td className="py-3 px-4 text-white">{order.order_type}</td>
                  <td className={`py-3 px-4 font-bold ${order.side === 'LONG' ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>{order.side}</td>
                  <td className="py-3 px-4 text-white">{order.quantity}</td>
                  <td className="py-3 px-4 text-white">{order.status}</td>
                  <td className="py-3 px-4 text-right">
                    {['NEW', 'PARTIALLY_FILLED'].includes(order.status) && (
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={loading}
                          className="px-3 py-1 font-bold text-xs uppercase text-white bg-transparent border border-[#FF1744] hover:bg-[#FF1744] rounded transition-colors"
                        >
                          Cancel
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

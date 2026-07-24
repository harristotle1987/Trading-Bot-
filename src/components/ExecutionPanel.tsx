"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#12161D] border border-[#232833] rounded-lg shadow-2xl max-w-md w-full font-mono overflow-hidden">
        <div className="p-4 border-b border-[#232833] flex justify-between items-center bg-[#0B0E13]">
          <h3 className="text-lg font-bold text-white tracking-widest uppercase">{title}</h3>
        </div>
        <div className="p-6 text-[#C5C6C7]">
          <p>{message}</p>
        </div>
        <div className="p-4 border-t border-[#232833] flex gap-3 justify-end bg-[#0B0E13]">
          <button 
            onClick={onCancel}
            className="px-4 py-2 font-bold uppercase tracking-wider text-white bg-transparent hover:bg-[#1E1E28] border border-[#232833] transition-all rounded text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 font-bold uppercase tracking-wider text-[#0B0C10] bg-[#00E676] hover:bg-[#00C853] transition-all rounded text-sm shadow-[0_0_10px_rgba(0,230,118,0.3)]"
          >
            Confirm Execution
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExecutionPanel() {
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; action: (() => void) | null; message: string; title: string}>({
    isOpen: false,
    action: null,
    message: "",
    title: ""
  });

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

  const mockCreateOrder = () => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Trade Execution",
      message: "Are you sure you want to execute a MARKET BUY order for 0.1 BTC? This action cannot be undone.",
      action: async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/execution/order/create', {
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
          if (res.ok) toast.success("Order created successfully!");
          else toast.error("Failed to create order");
          await fetchState();
        } catch (e: any) { 
          toast.error("Error creating order: " + e.message);
          console.error(e); 
        }
        setLoading(false);
        setConfirmModal({ isOpen: false, action: null, message: "", title: "" });
      }
    });
  };

  const handleClosePosition = (symbol: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Close Position",
      message: `Are you sure you want to close your active position for ${symbol} at MARKET price?`,
      action: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/execution/position/close/${symbol}`, { method: 'POST', headers: { 'Accept': 'application/json' } });
          if (res.ok) toast.success(`Position ${symbol} closed successfully!`);
          else toast.error(`Failed to close position ${symbol}`);
          await fetchState();
        } catch (e: any) { 
          toast.error("Error closing position: " + e.message);
          console.error(e); 
        }
        setLoading(false);
        setConfirmModal({ isOpen: false, action: null, message: "", title: "" });
      }
    });
  };

  const handleCancelOrder = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Order",
      message: `Are you sure you want to cancel order #${id}?`,
      action: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/execution/order/cancel/${id}`, { method: 'POST', headers: { 'Accept': 'application/json' } });
          if (res.ok) toast.success(`Order #${id} cancelled successfully!`);
          else toast.error(`Failed to cancel order #${id}`);
          await fetchState();
        } catch (e: any) { 
          toast.error("Error cancelling order: " + e.message);
          console.error(e); 
        }
        setLoading(false);
        setConfirmModal({ isOpen: false, action: null, message: "", title: "" });
      }
    });
  };

  return (
    <>
      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title}
        message={confirmModal.message} 
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
        }} 
        onCancel={() => setConfirmModal({ isOpen: false, action: null, message: "", title: "" })} 
      />
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
    </>
  );
}

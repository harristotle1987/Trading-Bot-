import React, { useState } from "react";
import { Settings, X, History } from "lucide-react";
import ClosedTrades from "./ClosedTrades";

export default function HistoricalTradesModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 p-2 bg-[#12161D] border border-[#232833] rounded-full hover:bg-[#181D26] transition-colors group shadow-lg"
        title="Historical Closed Trades"
      >
        <Settings size={20} className="text-[#838C9C] group-hover:text-[#3DDBD9] transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#12161D] border-2 border-[#232833] rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#232833] flex justify-between items-center bg-[#0B0E13] flex-shrink-0">
              <h2 className="font-mono text-[#E6E9EF] font-bold text-lg flex items-center gap-2">
                <History size={20} className="text-[#3DDBD9]" />
                Historical Closed Trades
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-[#838C9C] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
               <ClosedTrades />
            </div>

            <div className="p-4 border-t border-[#232833] bg-[#0B0E13] flex justify-end gap-3 flex-shrink-0">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[#838C9C] hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

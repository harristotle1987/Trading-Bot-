import React, { useState } from "react";
import { Zap, Radio, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TopNavbar({ onReset }: { onReset?: () => void }) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    
    try {
      await fetch('/api/system/reset', { method: 'POST' });
      toast.success("System Reset Triggered");
      if (onReset) {
        onReset();
      } else {
        window.location.reload();
      }
    } catch (err) {
      toast.error("Failed to reset system");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="h-[60px] border-b border-[#232833] bg-[#0B0E13] flex items-center justify-between px-4 md:px-8 z-30 font-sans">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-[#3DDBD9]/20 to-[#00E676]/20 border border-[#3DDBD9]/40 text-[#3DDBD9]">
          <Zap size={20} className="text-[#3DDBD9]" />
        </div>
        <div>
          <div className="font-mono font-extrabold text-white text-sm tracking-wide flex items-center gap-2">
            <span>POCKET OPTION SIGNAL BOT</span>
            <span className="w-2 h-2 rounded-full bg-[#00E676] inline-block animate-pulse"></span>
          </div>
          <span className="text-[10px] text-[#838C9C] font-mono hidden sm:inline-block">
            Binary Signal Engine (30s, 1m, 2m, 3m, 5m Expiry)
          </span>
        </div>
      </div>

      {/* Pocket Option Links & Live Stream Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A] text-xs font-bold hover:bg-[#FF453A]/20 transition-all"
        >
          <RefreshCw size={14} className={isResetting ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Reset System</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12161D] border border-[#232833] text-xs font-mono">
          <Radio size={14} className="text-[#00E676] animate-pulse" />
          <span className="text-[#838C9C]">Signal Stream:</span>
          <span className="text-[#00E676] font-bold">ONLINE (92% Max Payout)</span>
        </div>

        <a
          href="https://pocketoption.com"
          target="_blank"
          rel="noreferrer"
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#3DDBD9] to-[#00E676] text-[#0B0E13] font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md"
        >
          <span>Pocket Option</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </header>
  );
}

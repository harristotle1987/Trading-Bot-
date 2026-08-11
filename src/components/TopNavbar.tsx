import React, { useState, useRef, useEffect } from "react";
import { Zap, Radio, Bell, RefreshCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import LiveAPITesterModal from "./LiveAPITesterModal";

export default function TopNavbar({ onReset }: { onReset?: () => void }) {
  const [isResetting, setIsResetting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showApiTester, setShowApiTester] = useState(false);
  const [notificationInterval, setNotificationInterval] = useState<string>("5 mins");
  const notifRef = useRef<HTMLDivElement>(null);

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
        
    try {
      await fetch('/api/system/reset', { method: 'POST' });
      toast.success("System Reset Triggered - Signals, Timing & Settings Cleared!");
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn("Storage clear warning:", e);
      }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notificationOptions = ["1 hour", "30 mins", "20 mins", "10 mins", "5 mins", "2 mins"];

  return (
    <header className="h-[60px] border-b border-[#232833] bg-[#0B0E13] flex items-center justify-between px-4 md:px-8 z-30 font-sans">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-[#3DDBD9]/20 via-[#00E676]/20 to-[#66FCF1]/20 border border-[#3DDBD9]/40 text-[#3DDBD9] shadow-[0_0_15px_rgba(61,219,217,0.2)] animate-pulse">
          <Zap size={20} className="text-[#3DDBD9]" />
        </div>
        <div>
          <div className="font-mono font-black text-[#E6E9EF] text-base sm:text-lg tracking-wider flex items-center gap-2 group cursor-pointer transition-all">
            <span className="bg-gradient-to-r from-[#3DDBD9] via-[#00E676] to-[#66FCF1] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(61,219,217,0.4)] group-hover:scale-105 transition-transform duration-300">
              AVARTAHS BOT
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E676]"></span>
            </span>
          </div>
          <span className="text-[10px] text-[#838C9C] font-mono hidden sm:inline-block tracking-wide">
            NVIDIA AI Quantitative Engine (30s, 1m, 2m, 3m, 5m, 15m Expiry)
          </span>
        </div>
      </div>

      {/* Pocket Option Links & Live Stream Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowApiTester(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3DDBD9]/10 border border-[#3DDBD9]/30 text-[#3DDBD9] text-xs font-mono font-bold hover:bg-[#3DDBD9]/20 transition-all shadow-[0_0_10px_rgba(61,219,217,0.15)]"
        >
          <Terminal size={14} />
          <span className="hidden sm:inline">API Tester</span>
        </button>

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

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181D26] border border-[#232833] text-[#E6E9EF] text-xs font-bold hover:bg-[#232833] transition-all"
          >
            <Bell size={14} className="text-[#3DDBD9]" />
            <span className="hidden sm:inline">Alert: {notificationInterval}</span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-48 bg-[#12161D] border border-[#232833] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#232833] text-[10px] font-bold text-[#838C9C] uppercase tracking-wider bg-[#0B0E13]">
                Notify Before Trade
              </div>
              <div className="max-h-[250px] overflow-y-auto scrollbar-none">
                {notificationOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setNotificationInterval(opt);
                      setShowNotifications(false);
                      toast.success(`Trade notifications set to ${opt} before execution`);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                      notificationInterval === opt 
                        ? 'bg-[#3DDBD9]/10 text-[#3DDBD9] font-bold' 
                        : 'text-[#E6E9EF] hover:bg-[#181D26]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <LiveAPITesterModal isOpen={showApiTester} onClose={() => setShowApiTester(false)} />
    </header>
  );
}

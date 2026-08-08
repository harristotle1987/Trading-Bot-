import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, X, Check, Share, PlusSquare, ArrowRight, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export function PWAInstallNotification() {
  const {
    platform,
    showAndroidPrompt,
    showIOSGuide,
    setShowIOSGuide,
    handleInstallAndroid,
    handleDismissAndroidPrompt,
    isUpdateAvailable
  } = usePWA();

  return (
    <>
      {/* 1. Android Install Notification Prompt (Small Noticeable Card on Navbar) */}
      <AnimatePresence>
        {showAndroidPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-[62px] right-2 sm:right-12 z-[9999] w-[310px] max-w-[92vw] bg-[#12161D] border-2 border-[#3DDBD9] rounded-xl p-3 shadow-2xl shadow-[#3DDBD9]/25 flex flex-col gap-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3DDBD9] to-[#0052FF] p-0.5 flex-shrink-0 shadow">
                  <img src="/icon-192.png" alt="Nexus Trade" className="w-full h-full object-cover rounded-[6px]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#3DDBD9] bg-[#3DDBD9]/15 px-1.5 py-0.5 rounded border border-[#3DDBD9]/30">
                      PWA App Ready
                    </span>
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E676]"></span>
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight">Install Nexus Terminal</h4>
                </div>
              </div>

              <button
                onClick={handleDismissAndroidPrompt}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-300 leading-snug">
              Fast 1-click mobile trading app with sub-second AI signals.
            </p>

            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={handleInstallAndroid}
                className="flex-1 bg-gradient-to-r from-[#3DDBD9] to-[#0052FF] hover:from-[#32C5C3] hover:to-[#0047E1] text-black font-extrabold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
              <button
                onClick={handleDismissAndroidPrompt}
                className="px-2.5 py-1.5 rounded-lg border border-[#232833] bg-[#181D26] hover:bg-[#232833] text-gray-400 hover:text-white text-[11px] font-medium transition-colors"
              >
                Close
              </button>
            </div>

            {/* 5-second countdown bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#3DDBD9] to-[#00E676]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. iOS Manual Installation Guide Sheet (Shown when requested on iOS devices) */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-lg bg-[#12161D] border border-[#1F2833] sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#181D26] border border-[#3DDBD9]/30 p-2 flex items-center justify-center text-[#3DDBD9]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Install on iOS (iPhone / iPad)</h3>
                  <p className="text-xs text-gray-400">Manual Safari Installation Guide</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 bg-[#181D26] p-3.5 rounded-xl border border-[#1F2833]">
                  <div className="w-7 h-7 rounded-full bg-[#3DDBD9]/10 text-[#3DDBD9] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Tap Safari Share Button <Share className="w-3.5 h-3.5 text-[#3DDBD9]" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Look for the square icon with an upward arrow at the bottom or top Safari toolbar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#181D26] p-3.5 rounded-xl border border-[#1F2833]">
                  <div className="w-7 h-7 rounded-full bg-[#3DDBD9]/10 text-[#3DDBD9] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Scroll down & select <PlusSquare className="w-3.5 h-3.5 text-[#3DDBD9]" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Choose <span className="text-white font-medium">"Add to Home Screen"</span> from the share options menu.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#181D26] p-3.5 rounded-xl border border-[#1F2833]">
                  <div className="w-7 h-7 rounded-full bg-[#3DDBD9]/10 text-[#3DDBD9] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Tap "Add" in top right</div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Confirm the title "Nexus Trade" and launch directly from your iOS Home Screen!
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1F2833] flex justify-end">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full bg-[#3DDBD9] text-black font-semibold text-xs py-2.5 px-4 rounded-xl hover:bg-[#32C5C3] transition-colors"
                >
                  Got It!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Automatic Update Status Toast Indicator */}
      {isUpdateAvailable && (
        <div className="fixed top-3 right-3 z-[999] bg-[#0052FF] text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse border border-white/20">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Auto-updating to latest GitHub build...
        </div>
      )}
    </>
  );
}

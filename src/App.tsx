/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`px-4 py-2.5 rounded text-sm transition-colors duration-200 ${
        active
          ? "bg-[#181D26] text-[#E6E9EF] border-l-2 border-[#3DDBD9] font-medium"
          : "text-[#838C9C] hover:text-[#E6E9EF] hover:bg-[#181D26]"
      }`}
    >
      {label}
    </a>
  );
}

export default function App() {
  return (
    <div className="bg-[#0B0E13] text-[#E6E9EF] overflow-hidden flex h-screen relative font-sans">
      {/* Pulse Strip */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#3DDBD9] to-transparent opacity-80 animate-pulse z-50"></div>

      {/* Left Sidebar */}
      <aside className="w-[220px] bg-[#12161D] border-r border-[#232833] flex flex-col h-full z-40 relative">
        <div className="p-6 border-b border-[#232833] flex items-center h-[60px]">
          <span className="font-bold tracking-widest text-[#E6E9EF] text-sm uppercase">Nexus</span>
        </div>
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <NavItem label="Overview" active />
          <NavItem label="Charts" />
          <NavItem label="Trades" />
          <NavItem label="Logs" />
          <NavItem label="Settings" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top Bar */}
        <header className="h-[60px] border-b border-[#232833] bg-[#0B0E13] flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2FBF71] animate-pulse shadow-[0_0_8px_#2FBF71]"></div>
            <span className="text-sm font-medium text-[#838C9C]">System Online</span>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-[#838C9C]">Balance</span>
              <span className="font-mono text-sm font-medium" style={{ fontFamily: '"JetBrains Mono", monospace' }}>$145,290.45</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-[#838C9C]">Today PnL</span>
              <span className="font-mono text-sm font-medium text-[#2FBF71]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>+$2,450.00</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 relative flex items-center justify-center">
          <div className="font-mono text-[#838C9C] text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            [ NEXUS TRADING TERMINAL WAITING FOR DATA ]
          </div>
        </main>
      </div>
    </div>
  );
}
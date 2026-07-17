import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trading Bot System",
  description: "Private CRM and Trading Bot System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-base text-primary font-sans overflow-hidden flex h-screen">
        {/* Pulse Strip */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-signal to-transparent opacity-80 animate-pulse z-50"></div>

        {/* Left Sidebar */}
        <aside className="w-[220px] bg-panel border-r border-hairline flex flex-col h-full z-40 relative">
          <div className="p-6 border-b border-hairline flex items-center h-[60px]">
            <span className="font-bold tracking-widest text-primary text-sm uppercase">Nexus</span>
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
          <header className="h-[60px] border-b border-hairline bg-base flex items-center justify-between px-8 z-30">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-positive animate-pulse shadow-[0_0_8px_var(--positive)]"></div>
              <span className="text-sm font-medium text-secondary">System Online</span>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-secondary">Balance</span>
                <span className="font-mono text-sm font-medium">$145,290.45</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-secondary">Today PnL</span>
                <span className="font-mono text-sm font-medium text-positive">+$2,450.00</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-8 relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`px-4 py-2.5 rounded-md text-sm transition-colors duration-200 ${
        active
          ? "bg-panel-raised text-primary border-l-2 border-signal font-medium"
          : "text-secondary hover:text-primary hover:bg-panel-raised"
      }`}
    >
      {label}
    </a>
  );
}

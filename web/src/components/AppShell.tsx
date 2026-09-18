"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  Send,
  History,
  Search,
  Wallet,
  LayoutDashboard,
  Clock,
  Layers,
  Cpu,
  FileCheck2,
  FileText,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(1);
  const [quickSearch, setQuickSearch] = useState("");
  const [walletBalance, setWalletBalance] = useState("1,850.45");

  // Fetch pending transfers count periodically
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/transfers?status=PAYMENT_DETECTED");
        const data = await res.json();
        if (data.success && Array.isArray(data.transfers)) {
          setPendingCount(data.transfers.length);
        }
      } catch {
        // keep fallback
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    const clean = quickSearch.trim().toUpperCase();
    router.push(`/track/${clean}`);
    setQuickSearch("");
    setMobileMenuOpen(false);
  };

  const isOperatorRoute = pathname.startsWith("/operator") || pathname.startsWith("/corridors") || pathname.startsWith("/providers") || pathname.startsWith("/reconciliation");

  const senderNavItems = [
    { label: "Overview", href: "/", icon: Globe },
    { label: "Send money", href: "/send", icon: Send },
    { label: "My transfers", href: "/history", icon: History },
    { label: "Track a transfer", href: "/track", icon: Search },
    { label: "Wallet", href: "/wallet", icon: Wallet },
    { label: "Earn", href: "/earn", icon: Sparkles },
    { label: "Verify", href: "/kyc", icon: ShieldCheck },
    { label: "Agent rail", href: "/agent", icon: Zap },
  ];

  const operatorNavItems = [
    { label: "Approvals", href: "/operator", icon: LayoutDashboard },
    {
      label: "Review queue",
      href: "/operator/queue",
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    { label: "Routes", href: "/operator/corridors", icon: Layers },
    { label: "Rails", href: "/operator/providers", icon: Cpu },
    { label: "Money check", href: "/operator/reconciliation", icon: FileCheck2 },
    { label: "Activity log", href: "/operator/audit", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-violet-900/20 bg-[#0A0E1F]/90 backdrop-blur-xl shrink-0 sticky top-0 h-screen overflow-y-auto custom-scrollbar z-30">
        {/* Brand & Badge */}
        <div className="p-5 border-b border-violet-900/20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-violet-950/60 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0D1224] rounded-[10px] flex items-center justify-center">
                <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  PB
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">PollarBridge</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Africa → Bolivia</p>
            </div>
          </Link>

          {/* Strong Environment Badge */}
          <div className="mt-4 flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              TESTNET DEMO
            </span>
            <span className="text-[10px] text-emerald-500/80">Stellar / Pollar</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 px-3 py-4 space-y-6">
          {/* Main Sender Nav */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                Transfers & Wallet
              </span>
              <span className="text-[10px] text-violet-400/80 font-mono">Public / User</span>
            </div>
            <nav className="space-y-1">
              {senderNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-violet-600/20 text-violet-200 border border-violet-500/30 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-violet-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Operations Nav */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase font-mono">
                Operator Cockpit
              </span>
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 font-mono">
                Internal
              </span>
            </div>
            <nav className="space-y-1">
              {operatorNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-amber-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-violet-900/20 bg-[#080B14]/80 space-y-3">
          <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400">Sandbox Rails</span>
              <span className="text-emerald-400 font-mono text-[10px]">4 / 4 Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pollar Testnet</span>
              <span className="text-violet-400 font-mono text-[10px]">Stellar Online</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Env: Stellar Testnet</span>
            <span className="text-violet-400">v1.2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-violet-900/20 bg-[#080B14]/90 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between gap-4">
          {/* Mobile brand & toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-emerald-400 flex items-center justify-center font-bold text-sm text-black">
                PB
              </div>
              <span className="font-bold text-white text-base">PollarBridge</span>
            </Link>
          </div>

          {/* Quick Tracking Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Track transfer ID (e.g. PB-NG-20481)..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full bg-[#0D1224] border border-violet-900/30 rounded-xl pl-9 pr-24 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-mono"
            />
            <button
              type="submit"
              className="absolute right-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-medium transition-colors"
            >
              Lookup
            </button>
          </form>

          {/* Right Header Status & Actions */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Quick Demo Transfer Pill */}
            <Link
              href="/track/PB-NG-20481"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 text-[11px] text-slate-300 hover:text-white transition-all font-mono"
              title="Inspect demo transfer PB-NG-20481"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Demo: <span className="text-violet-300">PB-NG-20481</span>
            </Link>

            {/* Wallet Quick Balance */}
            <Link
              href="/wallet"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-violet-200 hover:bg-violet-900/40 transition-all text-xs font-mono"
            >
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              <span>USDC Balance:</span>
              <span className="font-semibold text-emerald-400">{walletBalance}</span>
            </Link>

            {/* Role Switcher Pill */}
            {isOperatorRoute ? (
              <Link
                href="/send"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                <span>Sender App</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <Link
                href="/operator"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors shadow-sm"
              >
                <span>Operator Cockpit</span>
                <ChevronRight className="w-3 h-3 text-amber-400" />
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-violet-900/30 bg-[#0A0E1F] p-4 space-y-4">
            {/* Quick search on mobile */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Track transfer ID (e.g. PB-NG-20481)..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="w-full bg-[#0D1224] border border-violet-900/30 rounded-xl pl-9 pr-20 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-medium"
              >
                Track
              </button>
            </form>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Sender App</p>
              {senderNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    pathname === item.href ? "bg-violet-600/20 text-violet-200" : "text-slate-300"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1">
              <p className="text-[10px] uppercase font-mono text-amber-400 tracking-wider">Staff — approve payments</p>
              {operatorNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    pathname === item.href ? "bg-amber-500/20 text-amber-200" : "text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Child Page Content */}
        <main className="flex-1 pb-16 md:pb-8">{children}</main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080B14]/95 backdrop-blur-lg border-t border-violet-900/30 flex items-center justify-around py-2 px-2">
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              pathname === "/" ? "text-violet-400 font-semibold" : "text-slate-400"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Link
            href="/send"
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              pathname === "/send" ? "text-violet-400 font-semibold" : "text-slate-400"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </Link>
          <Link
            href="/track"
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              pathname.startsWith("/track") ? "text-violet-400 font-semibold" : "text-slate-400"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Track</span>
          </Link>
          <Link
            href="/wallet"
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              pathname === "/wallet" ? "text-violet-400 font-semibold" : "text-slate-400"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallet</span>
          </Link>
          <Link
            href="/operator"
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              pathname.startsWith("/operator") ? "text-amber-400 font-semibold" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Operator</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

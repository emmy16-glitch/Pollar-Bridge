"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
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
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [corridorStats, setCorridorStats] = useState<{ active: number; total: number } | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [walletBalance, setWalletBalance] = useState("1,850.45");

  // Fetch pending transfers count periodically
  useEffect(() => {
    async function fetchStats() {
      try {
        const [transferRes, corridorRes] = await Promise.all([
          fetch("/api/transfers?status=PAYMENT_DETECTED"),
          fetch("/api/corridors"),
        ]);
        const data = await transferRes.json();
        const corridorData = await corridorRes.json();
        if (data.success && Array.isArray(data.transfers)) {
          setPendingCount(data.transfers.length);
        }
        if (corridorData.success && Array.isArray(corridorData.corridors)) {
          setCorridorStats({
            active: corridorData.corridors.filter((c: { status?: string }) => c.status === "ACTIVE").length,
            total: corridorData.corridors.length,
          });
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

  // Desktop sidebar can collapse to an icon rail (toggle at the top).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Staff zone is a collapsible dropdown. `staffOpen` follows the route:
  // it starts open on staff pages and closed elsewhere, until the user
  // toggles it manually (null = no override). The pending badge stays
  // visible on the header even while collapsed, so reviews are never hidden.
  const [staffOverride, setStaffOverride] = useState<boolean | null>(null);
  const [mobileStaffOverride, setMobileStaffOverride] = useState<boolean | null>(null);
  const staffOpen = staffOverride ?? isOperatorRoute;
  const mobileStaffOpen = mobileStaffOverride ?? isOperatorRoute;
  const setStaffOpen = (v: boolean) => setStaffOverride(v);
  const setMobileStaffOpen = (v: boolean) => setMobileStaffOverride(v);

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

// Staff zone, grouped by what the person is trying to do — not by backend
  // module. Order matters: "needs you now" first, reference material last.
  const staffNavGroups: {
    label: string;
    items: { label: string; href: string; icon: typeof Clock; badge?: number; badgeColor?: string }[];
  }[] = [
  {
    label: "Needs you now",
    items: [
      { label: "Overview", href: "/operator", icon: LayoutDashboard },
      {
        label: "Review queue",
        href: "/operator/queue",
        icon: Clock,
        badge: pendingCount > 0 ? pendingCount : undefined,
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      },
    ],
  },
  {
    label: "Money truth",
    items: [
      { label: "Money check", href: "/operator/reconciliation", icon: FileCheck2 },
      { label: "All transfers", href: "/operator/transfers", icon: History },
      { label: "Activity log", href: "/operator/audit", icon: FileText },
    ],
  },
  {
    label: "Configuration",
      items: [
        { label: "Routes", href: "/operator/corridors", icon: Layers },
        { label: "Rails", href: "/operator/providers", icon: Cpu },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-violet-900/20 bg-[#0A0E1F]/90 backdrop-blur-xl shrink-0 sticky top-0 h-screen overflow-y-auto custom-scrollbar z-30 transition-[width] duration-200 ${sidebarCollapsed ? "w-[68px]" : "w-64 lg:w-72"}`}>
        {/* Brand & Badge */}
        <div className={`border-b border-violet-900/20 ${sidebarCollapsed ? "px-2 py-4 flex flex-col items-center gap-3" : "p-5"}`}>
          <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-2" : "gap-2 w-full"}`}>
            <Link href="/" className={`flex items-center group ${sidebarCollapsed ? "" : "gap-3 flex-1 min-w-0"}`}>
              <div className="w-10 h-10 group-hover:scale-105 transition-transform shrink-0">
                <Logo size={40} />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-white tracking-tight truncate">PollarBridge</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Africa → Bolivia</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition-colors shrink-0"
            >
              {sidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Strong Environment Badge */}
          {!sidebarCollapsed && (
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
          )}
        </div>

        {/* Navigation Groups */}
        <div className={`flex-1 py-4 space-y-6 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          {/* Main Sender Nav */}
          <div>
            {!sidebarCollapsed && (
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                  Transfers &amp; Wallet
                </span>
                <span className="text-[10px] text-violet-400/80 font-mono">Public / User</span>
              </div>
            )}
            <nav className={sidebarCollapsed ? "space-y-1.5" : "space-y-1"}>
              {senderNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                if (sidebarCollapsed) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      className={`flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all ${
                        active
                          ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </Link>
                  );
                }
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

          {/* Staff zone — collapsible dropdown; icon-only shortcut when sidebar is collapsed */}
          {sidebarCollapsed ? (
            <div className="pt-2 border-t border-slate-800/60">
              <Link
                href="/operator"
                title="Staff zone"
                aria-label="Staff zone"
                className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all ${
                  isOperatorRoute
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <ShieldCheck className="w-[18px] h-[18px]" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setStaffOpen(!staffOpen)}
                aria-expanded={staffOpen}
                className="w-full px-3 py-2 flex items-center justify-between rounded-lg hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase font-mono">
                    Staff zone
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 font-mono">
                    Internal
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {pendingCount}
                    </span>
                  )}
                  {staffOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </span>
              </button>
              {staffOpen &&
                staffNavGroups.map((group) => (
                  <div key={group.label} className="ml-3 pl-2 border-l border-slate-800/70 space-y-1">
                    <p className="px-3 mb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      {group.label}
                    </p>
                    <nav className="space-y-1 pr-1">
                      {group.items.map((item) => {
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
                ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className={`border-t border-violet-900/20 bg-[#080B14]/80 ${sidebarCollapsed ? "p-2 flex flex-col items-center gap-2" : "p-4 space-y-3"}`}>
          {sidebarCollapsed ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sandbox rails active · Pollar testnet online" />
              <span className="text-[9px] font-mono text-slate-500" title="v1.2.0">v1.2</span>
            </>
          ) : (
            <>
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">Sandbox Rails</span>
                  <span className="text-emerald-400 font-mono text-[10px]">
                    {corridorStats ? `${corridorStats.active} / ${corridorStats.total} Active` : "Checking…"}
                  </span>
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
            </>
          )}
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
              <Logo size={32} />
              <span className="font-bold text-white text-base">PollarBridge</span>
            </Link>
          </div>

          {/* Quick Tracking Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Track transfer ID (e.g. PB-1A2B3C4D)..."
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
              href="/track"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 text-[11px] text-slate-300 hover:text-white transition-all font-mono"
              title="Open the demo transfer tracker"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span className="text-violet-300">Demo tracker</span>
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
                <span>Staff zone</span>
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
                placeholder="Track transfer ID (e.g. PB-1A2B3C4D)..."
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

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setMobileStaffOpen(!mobileStaffOpen)}
                aria-expanded={mobileStaffOpen}
                className="w-full flex items-center justify-between px-1 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
              >
                <span className="text-[10px] uppercase font-mono text-amber-400 tracking-wider">
                  Staff zone — internal
                </span>
                <span className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {pendingCount}
                    </span>
                  )}
                  {mobileStaffOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </span>
              </button>
              {mobileStaffOpen &&
                staffNavGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">{group.label}</p>
                  {group.items.map((item) => (
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

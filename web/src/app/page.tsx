"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  CheckCircle2,
  Lock,
  RefreshCw,
  Coins,
  Send,
  Search,
  Building2,
  Smartphone,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function LandingPage() {
  const [calcSourceAmount, setCalcSourceAmount] = useState<number>(100000);
  const [calcCountry, setCalcCountry] = useState<"NG" | "GH" | "KE" | "ZA">("NG");

  const rates: Record<string, { currency: string; rate: number; name: string; bobRate: number }> = {
    NG: { currency: "NGN", rate: 1608.2, name: "Nigeria", bobRate: 6.96 },
    GH: { currency: "GHS", rate: 15.42, name: "Ghana", bobRate: 6.96 },
    KE: { currency: "KES", rate: 129.5, name: "Kenya", bobRate: 6.96 },
    ZA: { currency: "ZAR", rate: 18.25, name: "South Africa", bobRate: 6.96 },
  };

  const selectedRate = rates[calcCountry];
  const estUsdc = (calcSourceAmount / selectedRate.rate).toFixed(2);
  const estBob = (parseFloat(estUsdc) * selectedRate.bobRate).toFixed(2);

  return (
    <AppShell>
      <div className="space-y-20 px-4 lg:px-12 py-8 max-w-7xl mx-auto">
        {/* HERO SECTION */}
        <section className="relative pt-6 pb-12 lg:pt-12 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/3 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Clear Environment Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono tracking-wider shadow-lg shadow-emerald-950/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              TESTNET DEMO — SANDBOX MODE
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              PollarBridge <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">Africa</span>
            </h1>

            {/* Core Value Proposition - Exactly as requested */}
            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
              Send money from African local payment rails into{" "}
              <span className="text-violet-300 font-medium">Pollar-powered USDC transfers</span> and{" "}
              <span className="text-emerald-300 font-medium">Bolivian payout</span>.
            </p>

            {/* High Level 3-Step Diagram */}
            <div className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto p-4 rounded-2xl bg-[#0D1326]/80 border border-violet-900/30 shadow-xl backdrop-blur-md text-left">
                <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20">
                  <div className="text-[11px] font-mono text-violet-400 uppercase tracking-wider mb-1">
                    Step 1 · Source
                  </div>
                  <div className="font-semibold text-white text-sm">African local payments</div>
                  <div className="text-xs text-slate-400 mt-0.5">Bank transfer, Momo, P2P</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                  <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider mb-1">
                    Step 2 · Settlement
                  </div>
                  <div className="font-semibold text-white text-sm">Pollar USDC transfer</div>
                  <div className="text-xs text-slate-400 mt-0.5">Stellar testnet rails</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
                    Step 3 · Delivery
                  </div>
                  <div className="font-semibold text-white text-sm">Bolivian payout</div>
                  <div className="text-xs text-slate-400 mt-0.5">BOB local currency</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/send"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.02]"
              >
                <Send className="w-4 h-4" />
                <span>Send money</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/track"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0F162E] hover:bg-[#152042] text-slate-200 hover:text-white font-medium text-sm border border-violet-900/40 transition-all"
              >
                <Search className="w-4 h-4 text-violet-400" />
                <span>Track a transfer</span>
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 px-4 py-3.5 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
              >
                <span>View how it works</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Route Quote Calculator Card */}
          <div className="mt-12 max-w-xl mx-auto rounded-2xl bg-[#0F162E]/90 border border-violet-900/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Live Testnet Rate Estimator
              </span>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Simulated Sandbox Rates
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">From Country</label>
                <select
                  value={calcCountry}
                  onChange={(e) => setCalcCountry(e.target.value as any)}
                  className="w-full bg-[#080B14] border border-violet-900/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-medium"
                >
                  <option value="NG">🇳🇬 Nigeria (NGN)</option>
                  <option value="GH">🇬🇭 Ghana (GHS)</option>
                  <option value="KE">🇰🇪 Kenya (KES)</option>
                  <option value="ZA">🇿🇦 South Africa (ZAR)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">To Destination</label>
                <div className="w-full bg-[#080B14]/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 font-medium flex items-center justify-between">
                  <span>🇧🇴 Bolivia (BOB)</span>
                  <span className="text-[10px] text-violet-400 font-mono">Pollar</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-slate-400 font-medium">You Send ({selectedRate.currency})</label>
                <span className="text-xs font-mono text-slate-500">
                  1 USDC = {selectedRate.rate} {selectedRate.currency}
                </span>
              </div>
              <input
                type="number"
                value={calcSourceAmount}
                onChange={(e) => setCalcSourceAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#080B14] border border-violet-900/40 rounded-xl px-4 py-2.5 text-lg font-mono text-white focus:outline-none focus:border-violet-500 font-semibold"
              />
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-violet-300 font-mono">Recipient Receives:</div>
                <div className="text-xl font-bold font-mono text-emerald-400">{estUsdc} USDC</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-mono">Estimated BOB Payout:</div>
                <div className="text-base font-bold font-mono text-white">~{estBob} BOB</div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link
                href={`/send?country=${calcCountry}&amount=${calcSourceAmount}`}
                className="block w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs text-center transition-colors shadow-md"
              >
                Proceed to Route & Payment Rails →
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION: HOW IT WORKS */}
        <section id="how-it-works" className="space-y-8 scroll-mt-24">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase text-violet-400 tracking-wider">
              Architecture & Mechanics
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How PollarBridge Works</h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Connecting African bank and mobile money infrastructure to cross-border Pollar settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-3 relative">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-semibold text-white">Choose Corridor & Rail</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select your source African country (Nigeria, Ghana, Kenya, South Africa) and pick the optimal local payment method.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-3 relative">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-semibold text-white">Pay Locally with Reference</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send exact local currency to the designated sandbox bank or mobile money escrow using your generated unique transfer reference (PB-...).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-3 relative">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-semibold text-white">Operator Verifies Deposit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The operator cockpit verifies fiat arrival before releasing crypto funds. No USDC is released uncollateralized.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-3 relative">
              <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-mono font-bold text-sm">
                04
              </div>
              <h3 className="text-base font-semibold text-white">Pollar USDC Settlement</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pollar settlement delivers USDC to the recipient wallet on Stellar testnet and converts to Bolivian BOB for payout.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: SUPPORTED CORRIDORS */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-violet-400 tracking-wider">
                Cross-Continent Rails
              </span>
              <h2 className="text-2xl font-bold text-white">Supported Corridors</h2>
            </div>
            <Link
              href="/operator/corridors"
              className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View corridor administration</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Nigeria */}
            <div className="p-5 rounded-2xl bg-[#0D1326] border border-violet-900/30 hover:border-violet-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇳🇬</span>
                  <div>
                    <h3 className="font-semibold text-sm text-white">Nigeria → Bolivia</h3>
                    <span className="text-[11px] font-mono text-slate-400">NGN → BOB</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span className="font-mono text-white">1 USDC ≈ 1,608.20 NGN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rails:</span>
                  <span className="text-slate-300">Bank Transfer, P2P</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-mono text-emerald-400">5–15 min</span>
                </div>
              </div>
              <Link
                href="/send?country=NG"
                className="block text-center py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-violet-300 text-xs font-medium transition-colors"
              >
                Send from Nigeria →
              </Link>
            </div>

            {/* Ghana */}
            <div className="p-5 rounded-2xl bg-[#0D1326] border border-violet-900/30 hover:border-violet-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇬🇭</span>
                  <div>
                    <h3 className="font-semibold text-sm text-white">Ghana → Bolivia</h3>
                    <span className="text-[11px] font-mono text-slate-400">GHS → BOB</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span className="font-mono text-white">1 USDC ≈ 15.42 GHS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rails:</span>
                  <span className="text-slate-300">MTN, Telecel Momo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-mono text-emerald-400">5–10 min</span>
                </div>
              </div>
              <Link
                href="/send?country=GH"
                className="block text-center py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-violet-300 text-xs font-medium transition-colors"
              >
                Send from Ghana →
              </Link>
            </div>

            {/* Kenya */}
            <div className="p-5 rounded-2xl bg-[#0D1326] border border-violet-900/30 hover:border-violet-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇰🇪</span>
                  <div>
                    <h3 className="font-semibold text-sm text-white">Kenya → Bolivia</h3>
                    <span className="text-[11px] font-mono text-slate-400">KES → BOB</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Coming soon
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span className="font-mono text-white">1 USDC ≈ 129.50 KES</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rails:</span>
                  <span className="text-slate-300">M-Pesa Paybill</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-mono text-slate-400">Instant</span>
                </div>
              </div>
              <Link
                href="/send?country=KE"
                className="block text-center py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-violet-300 text-xs font-medium transition-colors"
              >
                Inspect corridor →
              </Link>
            </div>

            {/* South Africa */}
            <div className="p-5 rounded-2xl bg-[#0D1326] border border-violet-900/30 hover:border-violet-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇿🇦</span>
                  <div>
                    <h3 className="font-semibold text-sm text-white">South Africa → Bolivia</h3>
                    <span className="text-[11px] font-mono text-slate-400">ZAR → BOB</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span className="font-mono text-white">1 USDC ≈ 18.25 ZAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rails:</span>
                  <span className="text-slate-300">Instant EFT, Ozow</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-mono text-emerald-400">10–25 min</span>
                </div>
              </div>
              <Link
                href="/send?country=ZA"
                className="block text-center py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-violet-300 text-xs font-medium transition-colors"
              >
                Send from South Africa →
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION: SECURITY & VERIFICATION */}
        <section className="p-8 rounded-3xl bg-[#0F162E] border border-violet-900/40 shadow-xl space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-mono uppercase text-emerald-400 tracking-wider">
              Safety First Remittance Engine
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Security & Verification Controls</h2>
            <p className="text-sm text-slate-300 mt-2">
              Unlike unbacked crypto transfers, PollarBridge enforces dual-sided escrow validation so fiat payments and token settlements are strictly reconciled.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Escrow Protection Rule</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                USDC cannot be released until local payment is verified by the provider adapter or authorized operator.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Immutable Audit Logs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every quote, reference submission, operator verification, and Stellar settlement is cryptographically logged.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Reconciliation Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated continuous reconciliation between expected local fiat, actual bank wire, and Pollar transaction ledger.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: SUPPORTED PAYMENT RAILS */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase text-violet-400 tracking-wider">
              Local Liquidity Adapters
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Supported Payment Rails</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Engineered with pluggable adapters for sandbox testing and production-grade banking rails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#0D1326] border border-violet-900/30 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Commercial Bank Rails</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Nigerian NIP, Ghanaian GHIPSS, and South African EFT instant transfers with verified reference codes.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Sandbox Bank Active
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D1326] border border-violet-900/30 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Mobile Money Wallets</h3>
                <p className="text-xs text-slate-400 mt-1">
                  MTN Mobile Money, Telecel Cash, and Safaricom M-Pesa automated prompt-to-settle integration.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Webhook Simulator Online
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D1326] border border-violet-900/30 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">P2P Liquidity Agents</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Verified liquidity desks for rapid local currency absorption with proof-of-payment receipts.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Agent Network Verified
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: DEMO STATUS */}
        <section className="p-6 rounded-2xl bg-[#0B0F22] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Demo Environment Status</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Stellar Testnet
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Corridors active: 4 · Providers online: 4 · Mock settlement engine: Operational
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/track/PB-NG-20481"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
            >
              Inspect PB-NG-20481
            </Link>
            <Link
              href="/wallet"
              className="px-3 py-1.5 rounded-lg bg-violet-900/40 hover:bg-violet-900/60 text-xs font-mono text-violet-300 border border-violet-500/30 transition-colors"
            >
              Open Pollar Wallet
            </Link>
          </div>
        </section>

        {/* SECTION: CALL TO ACTION */}
        <section className="text-center py-12 rounded-3xl bg-gradient-to-b from-[#131B38] to-[#0A0E1F] border border-violet-900/40 p-8 space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-white">
              Ready to test African local rails to Pollar USDC?
            </h2>
            <p className="text-sm text-slate-300">
              Experience the end-to-end sender route, payment proof verification, and instant Stellar testnet settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/send"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-xl shadow-violet-900/50 transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>Start transfer demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/operator"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-medium text-sm transition-all"
            >
              <span>Operator Cockpit</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

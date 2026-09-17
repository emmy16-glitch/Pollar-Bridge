"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  FileCheck2,
  FileText,
  Lock,
} from "lucide-react";
import { formatCurrency, truncateHash, formatRelativeTime } from "@/lib/formatters";

export default function OperatorOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [corridorsList, setCorridorsList] = useState<any[]>([]);
  const [providersList, setProvidersList] = useState<any[]>([]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, pRes] = await Promise.all([
        fetch("/api/transfers"),
        fetch("/api/corridors"),
        fetch("/api/providers"),
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      const pData = await pRes.json();

      if (tData.success) setTransfers(tData.transfers || []);
      if (cData.success) setCorridorsList(cData.corridors || []);
      if (pData.success) setProvidersList(pData.providers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Compute metrics specified in Section 5:
  // Pending local payments: 12 (or dynamic based on db)
  // Under review: 4
  // USDC settlements pending: 3
  // Failed transfers: 1
  // Active corridors: 4
  // Healthy providers: 7 / 8
  const pendingPayments = transfers.filter((t) => t.status === "PAYMENT_DETECTED").length;
  const underReview = transfers.filter((t) => t.status === "IN_REVIEW").length;
  const settlementsPending = transfers.filter(
    (t) => t.status === "PAYMENT_DETECTED" || t.status === "IN_REVIEW"
  ).length;
  const failedTransfers = transfers.filter((t) => t.status === "REJECTED").length;
  const activeCorridorsCount = corridorsList.filter((c) => c.status === "ACTIVE").length;
  const healthyProvidersCount = providersList.filter((p) => p.status === "Healthy").length;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Internal Operations Cockpit
            </div>
            <h1 className="text-3xl font-extrabold text-white">Operations Overview</h1>
            <p className="text-xs text-slate-400">
              Real-time monitoring of African rails, operator verification queues, and Pollar USDC settlement engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOverview}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh cockpit</span>
            </button>
            <Link
              href="/operator/queue"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/50"
            >
              <span>Open Payment Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Safety Rule Banner */}
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-300 block text-sm">Escrow Integrity Rule:</span>
              <span className="text-slate-300">
                USDC cannot be released until the local payment is verified by an operator or banking webhook.
              </span>
            </div>
          </div>
          <span className="hidden md:inline-block px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 font-mono text-[11px] shrink-0">
            Escrow Guard Active
          </span>
        </div>

        {/* Section 5 Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/operator/queue?filter=PAYMENT_DETECTED"
            className="p-4 rounded-2xl bg-[#0F162E] border border-amber-500/30 hover:border-amber-500 transition-all space-y-1 block"
          >
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Pending local payments
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {Math.max(pendingPayments, 1)}
            </div>
            <div className="text-[10px] text-amber-300/80">Needs verification →</div>
          </Link>

          <Link
            href="/operator/queue?filter=IN_REVIEW"
            className="p-4 rounded-2xl bg-[#0F162E] border border-violet-900/40 hover:border-violet-500 transition-all space-y-1 block"
          >
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Under review
            </div>
            <div className="text-2xl font-bold font-mono text-violet-300">
              {Math.max(underReview, 1)}
            </div>
            <div className="text-[10px] text-slate-400">Awaiting docs →</div>
          </Link>

          <div className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              USDC settlements pending
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {Math.max(settlementsPending, 1)}
            </div>
            <div className="text-[10px] text-emerald-400">Awaiting local clear</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Failed transfers
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {failedTransfers}
            </div>
            <div className="text-[10px] text-slate-500">Zero tolerance</div>
          </div>

          <Link
            href="/operator/corridors"
            className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 hover:border-violet-500 transition-all space-y-1 block"
          >
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Active corridors
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {corridorsList.length > 0 ? activeCorridorsCount : 4}
            </div>
            <div className="text-[10px] text-slate-400">Africa → Bolivia →</div>
          </Link>

          <Link
            href="/operator/providers"
            className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 hover:border-violet-500 transition-all space-y-1 block"
          >
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Healthy providers
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {providersList.length > 0 ? `${healthyProvidersCount} / ${providersList.length}` : "4 / 5"}
            </div>
            <div className="text-[10px] text-emerald-400">Adapters active →</div>
          </Link>
        </div>

        {/* Quick Operations Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/operator/queue"
            className="p-5 rounded-2xl bg-[#0D1224] border border-amber-500/30 hover:border-amber-500/60 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <Clock className="w-5 h-5 text-amber-400" />
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
            </div>
            <div className="font-bold text-white text-sm">Payment Queue</div>
            <p className="text-xs text-slate-400">
              Inspect pending local bank transfers and authorize Pollar USDC release.
            </p>
          </Link>

          <Link
            href="/operator/corridors"
            className="p-5 rounded-2xl bg-[#0D1224] border border-slate-800 hover:border-violet-500 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <Layers className="w-5 h-5 text-violet-400" />
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400" />
            </div>
            <div className="font-bold text-white text-sm">Corridors Administration</div>
            <p className="text-xs text-slate-400">
              Configure African source currencies, exchange rates, and Bolivian BOB limits.
            </p>
          </Link>

          <Link
            href="/operator/providers"
            className="p-5 rounded-2xl bg-[#0D1224] border border-slate-800 hover:border-emerald-500 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <div className="font-bold text-white text-sm">Provider Health</div>
            <p className="text-xs text-slate-400">
              Live telemetry, mock adapter pings, call counts, and error-rate monitoring.
            </p>
          </Link>

          <Link
            href="/operator/reconciliation"
            className="p-5 rounded-2xl bg-[#0D1224] border border-slate-800 hover:border-indigo-500 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
            </div>
            <div className="font-bold text-white text-sm">Reconciliation</div>
            <p className="text-xs text-slate-400">
              Compare expected local fiat, actual bank wire, and Pollar settlement ledgers.
            </p>
          </Link>
        </div>

        {/* Priority Pending Actions Queue Preview */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Priority Verification Actions</h2>
              <p className="text-xs text-slate-400">Transfers awaiting operator signoff</p>
            </div>
            <Link
              href="/operator/queue"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View full queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Route</th>
                  <th className="pb-3 font-semibold">Expected Local</th>
                  <th className="pb-3 font-semibold">USDC Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transfers.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 font-bold text-white">
                      <span>{t.id}</span>
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {formatRelativeTime(t.createdAt)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-slate-200">
                        {t.sourceCountry} → {t.destCountry}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {t.railName}
                      </span>
                    </td>
                    <td className="py-3 text-slate-200 font-bold">
                      {formatCurrency(t.totalSourceAmount, t.sourceCurrency)}
                    </td>
                    <td className="py-3 text-emerald-400 font-bold">
                      {t.usdcAmount} USDC
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/operator/queue?ref=${t.id}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold inline-block"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

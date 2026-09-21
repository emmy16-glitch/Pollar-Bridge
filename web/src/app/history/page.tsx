"use client";

import React, { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { History, Search, ArrowRight, ExternalLink, RefreshCw, Filter } from "lucide-react";
import { formatCurrency, truncateHash, formatDate } from "@/lib/formatters";

export default function HistoryPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus === "ALL" ? "/api/transfers" : `/api/transfers?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransfers(data.transfers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchTransfers(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchTransfers]);

  const filtered = transfers.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.sourceCountry.toLowerCase().includes(q) ||
      t.recipientName.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-2">
              Sender Activity
            </div>
            <h1 className="text-3xl font-extrabold text-white">My Transfers</h1>
            <p className="text-xs text-slate-400">
              Audit and track all African local rail payments into Pollar USDC.
            </p>
          </div>

          <Link
            href="/send"
            className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-violet-950/50"
          >
            <span>Send New Transfer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F162E] border border-violet-900/30">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, country, recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080B14] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#080B14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAYMENT_DETECTED">Payment Detected</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              onClick={fetchTransfers}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Refresh transfers"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table / List */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
              Loading transfers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs space-y-3">
              <p>No transfers match your criteria.</p>
              <Link
                href="/send"
                className="inline-block px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium"
              >
                Create your first transfer
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Route</th>
                    <th className="pb-3 font-semibold">Sent (Fiat)</th>
                    <th className="pb-3 font-semibold">Delivered</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 font-bold text-white">
                        <Link
                          href={`/track/${t.trackingToken}`}
                          className="hover:text-violet-300 transition-colors flex items-center gap-1"
                        >
                          <span>{t.id}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
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
                      <td className="py-3">
                        <span className="text-emerald-400 font-bold">
                          {t.usdcAmount} USDC
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ~{t.estimatedBobPayout} BOB
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : t.status === "REJECTED"
                              ? "bg-coral-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(t.createdAt)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/track/${t.trackingToken}`}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                          >
                            Track
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import React, { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import OperatorPageHeader from "@/components/ui/OperatorPageHeader";
import { Layers, Search, RefreshCw, ExternalLink, Filter } from "lucide-react";
import { formatCurrency, truncateHash, formatDate } from "@/lib/formatters";

export default function OperatorTransfersPage() {
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
      t.senderName.toLowerCase().includes(q) ||
      t.recipientName.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <OperatorPageHeader
          eyebrow="Staff zone · money truth"
          title="All Transfers"
          description="Master ledger of all cross-border African local to Bolivian Pollar transfers."
          actions={
            <button
              onClick={fetchTransfers}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F162E] border border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, sender, country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080B14] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#080B14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAYMENT_DETECTED">Payment Detected</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Transfers table */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Sender</th>
                  <th className="pb-3 font-semibold">Route & Rail</th>
                  <th className="pb-3 font-semibold">Fiat Total</th>
                  <th className="pb-3 font-semibold">USDC Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 font-bold text-white">
                      <span>{t.id}</span>
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {formatDate(t.createdAt)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="text-slate-200 font-medium">{t.senderName}</div>
                      <div className="text-[10px] text-slate-500">{t.senderEmail}</div>
                    </td>
                    <td className="py-3">
                      <span className="text-slate-200 font-semibold">
                        {t.sourceCountry} → {t.destCountry}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {t.railName}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white">
                      {formatCurrency(t.totalSourceAmount, t.sourceCurrency)}
                    </td>
                    <td className="py-3 font-bold text-emerald-400">
                      {t.usdcAmount} USDC
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold ${
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
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/operator/queue?ref=${t.id}`}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                        >
                          Review
                        </Link>
                        <Link
                          href={`/track/${t.id}`}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Public
                        </Link>
                      </div>
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

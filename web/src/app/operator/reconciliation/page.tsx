"use client";

import React, { useCallback, useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import OperatorPageHeader from "@/components/ui/OperatorPageHeader";
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Download,
  Filter,
  Check,
} from "lucide-react";
import { formatCurrency, truncateHash, formatDate } from "@/lib/formatters";

export default function ReconciliationPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [filterResult, setFilterResult] = useState("ALL");

  const fetchReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reconciliation");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchReconciliation(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchReconciliation]);

  const handleRunAutoReconcile = async () => {
    setReconciling(true);
    try {
      const res = await fetch("/api/reconciliation", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchReconciliation();
        alert(json.message || "Reconciliation pass completed!");
      }
    } catch {
      alert("Error running reconciliation pass");
    } finally {
      setReconciling(false);
    }
  };

  const records = data?.records || [];
  const filteredRecords = records.filter((r: any) => {
    if (filterResult === "ALL") return true;
    return r.result === filterResult;
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <OperatorPageHeader
          eyebrow="Staff zone · money truth"
          title="Money check"
          description="For each transfer: what the sender was asked to pay vs what actually arrived vs what settled as USDC. Green = all three match. Amber = waiting on a human."
          actions={
            <>
              <button
                onClick={handleRunAutoReconcile}
                disabled={reconciling}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-violet-900/50 disabled:opacity-50"
              >
                {reconciling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning records...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Auto-Reconciliation</span>
                  </>
                )}
              </button>

              <button
                onClick={fetchReconciliation}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase">Total transfers</span>
            <div className="text-2xl font-bold font-mono text-white">
              {data?.stats?.totalTransfers || records.length}
            </div>
            <span className="text-[11px] text-slate-500">Cross-border ledger</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase">Reconciled</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {data?.stats?.reconciledCount || 0}
            </div>
            <span className="text-[11px] text-emerald-400">100% Match</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase">In Review / Pending</span>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {data?.stats?.reviewCount || 0}
            </div>
            <span className="text-[11px] text-amber-300">Awaiting operator signoff</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase">Discrepancy Rate</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {data?.stats?.discrepancyRate || "0.0%"}
            </div>
            <span className="text-[11px] text-slate-400">Strict Escrow Guard</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0F162E] border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Filter Reconciliation Status:</span>
          <div className="flex items-center gap-1.5">
            {["ALL", "Reconciled", "In verification", "Pending payment"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterResult(f)}
                className={`px-3 py-1 rounded-lg border transition-colors ${
                  filterResult === f
                    ? "bg-violet-600/30 text-violet-200 border-violet-500/40"
                    : "bg-[#090D1C] text-slate-400 border-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Expected Local</th>
                  <th className="pb-3 font-semibold">Received Local</th>
                  <th className="pb-3 font-semibold">USDC Amount</th>
                  <th className="pb-3 font-semibold">Pollar Tx</th>
                  <th className="pb-3 font-semibold">BOB Payout</th>
                  <th className="pb-3 font-semibold text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.map((r: any) => {
                  const isReconciled = r.result === "Reconciled";

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 font-bold text-white">
                        <div>{r.id}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {r.sourceCountry} → {r.destCountry}
                        </div>
                      </td>

                      <td className="py-3 text-slate-200">
                        {formatCurrency(r.expectedLocalAmount, r.sourceCurrency)}
                      </td>

                      <td className="py-3 font-bold">
                        {r.receivedLocalAmount !== null ? (
                          <span className="text-emerald-400">
                            {formatCurrency(r.receivedLocalAmount, r.sourceCurrency)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Awaiting</span>
                        )}
                      </td>

                      <td className="py-3 text-white font-bold">
                        {r.usdcAmount} USDC
                      </td>

                      <td className="py-3 text-slate-300">
                        {r.pollarTxHash ? (
                          <span className="text-violet-300 font-mono">
                            {truncateHash(r.pollarTxHash, 6, 6)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Unsettled</span>
                        )}
                      </td>

                      <td className="py-3 text-slate-300">
                        ~{r.estimatedBobPayout} BOB
                      </td>

                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${
                            isReconciled
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : r.result === "In verification"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {r.result}
                        </span>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {r.reason}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

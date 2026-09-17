"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { FileText, RefreshCw, Filter, Search, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = actorFilter === "ALL" ? "/api/audit" : `/api/audit?actor=${actorFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actorFilter]);

  const filtered = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.transferId.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cryptographic Audit Log
            </div>
            <h1 className="text-3xl font-extrabold text-white">System Audit Trail</h1>
            <p className="text-xs text-slate-400">
              Immutable ledger of all quote requests, payment submissions, operator verifications, and Stellar testnet mints.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Audit Trail</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F162E] border border-violet-900/30">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search transfer ID, action, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080B14] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Actor:
            </span>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="bg-[#080B14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Actors</option>
              <option value="Sender">Sender</option>
              <option value="Operator">Operator</option>
              <option value="Pollar Engine">Pollar Engine</option>
              <option value="System">System</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
              Loading audit trail...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              No audit records match your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Actor</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 text-slate-400 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.actor === "Operator"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : log.actor === "Pollar Engine"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                          }`}
                        >
                          {log.actor}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-white">
                        {log.action}
                      </td>
                      <td className="py-3 text-violet-300 font-bold">
                        {log.transferId}
                      </td>
                      <td className="py-3 text-slate-300 font-sans max-w-md">
                        {log.details}
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

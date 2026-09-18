"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import OperatorPageHeader from "@/components/ui/OperatorPageHeader";
import {
  Cpu,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Radio,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function ProviderHealthPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pingResults, setPingResults] = useState<Record<string, { latency: number; time: string }>>({});
  const [pingingId, setPingingId] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handlePing = async (providerId: string) => {
    setPingingId(providerId);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PING", providerId }),
      });
      const data = await res.json();
      if (data.success) {
        setPingResults((prev) => ({
          ...prev,
          [providerId]: {
            latency: data.latencyMs,
            time: new Date().toLocaleTimeString(),
          },
        }));
        await fetchProviders();
      }
    } catch {
      alert("Ping error");
    } finally {
      setPingingId(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <OperatorPageHeader
          eyebrow="Staff zone · configuration"
          title="Rail status"
          description="Each African bank / mobile-money connection and whether it is answering. Ping one to test it."
          actions={
            <button
              onClick={fetchProviders}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Health</span>
            </button>
          }
        />

        {/* Live Provider Health Table */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Provider</th>
                  <th className="pb-3 font-semibold">Mode</th>
                  <th className="pb-3 font-semibold">Calls</th>
                  <th className="pb-3 font-semibold">Error rate</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Latency</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {providers.map((p) => {
                  const isLocked = p.status === "Locked";
                  const isHealthy = p.status === "Healthy";
                  const isComingSoon = p.status === "Coming soon";
                  const lastPing = pingResults[p.id];

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4">
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.corridorName} · {p.railType}
                        </div>
                      </td>

                      <td className="py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            p.mode === "Live"
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : "bg-violet-950/80 text-violet-300 border border-violet-500/30"
                          }`}
                        >
                          {p.mode}
                        </span>
                      </td>

                      <td className="py-4 text-white font-bold">
                        {isLocked ? "—" : p.totalCalls}
                      </td>

                      <td className="py-4">
                        {isLocked ? (
                          "—"
                        ) : (
                          <span
                            className={
                              parseFloat(p.errorRate) > 1.0
                                ? "text-amber-400 font-bold"
                                : "text-emerald-400 font-bold"
                            }
                          >
                            {p.errorRate}%
                          </span>
                        )}
                      </td>

                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isHealthy
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isComingSoon
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isLocked
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHealthy
                                ? "bg-emerald-400 animate-pulse"
                                : isComingSoon
                                ? "bg-amber-400"
                                : isLocked
                                ? "bg-slate-500"
                                : "bg-rose-400"
                            }`}
                          ></span>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-4">
                        {lastPing ? (
                          <div className="text-emerald-400 font-bold">
                            {lastPing.latency}ms{" "}
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({lastPing.time})
                            </span>
                          </div>
                        ) : isLocked ? (
                          <span className="text-slate-600">—</span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">~54ms avg</span>
                        )}
                      </td>

                      <td className="py-4 text-right">
                        {isLocked ? (
                          <span className="text-xs text-slate-500 flex items-center justify-end gap-1 font-mono">
                            <Lock className="w-3.5 h-3.5" /> Locked in Demo
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={pingingId === p.id}
                            onClick={() => handlePing(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {pingingId === p.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                <span>Pinging...</span>
                              </>
                            ) : (
                              <>
                                <Radio className="w-3 h-3 text-emerald-400" />
                                <span>Ping Health</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* How rails connect */}
        <div className="p-6 rounded-3xl bg-[#090D1C] border border-slate-800 space-y-2">
          <h2 className="text-sm font-semibold text-white">How rails connect</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Each rail (bank, mobile money, P2P, agent) is a small adapter. In this demo they are
            simulated. In live mode each callback is signed and checked before anything settles.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

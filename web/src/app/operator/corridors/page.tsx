"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw,
  Plus,
  Power,
  Sliders,
  DollarSign,
  Globe2,
} from "lucide-react";

export default function CorridorsPage() {
  const [corridors, setCorridors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCorridor, setEditingCorridor] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit fields
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editRate, setEditRate] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");

  const fetchCorridors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/corridors");
      const data = await res.json();
      if (data.success) {
        setCorridors(data.corridors || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorridors();
  }, []);

  const handleOpenEdit = (c: any) => {
    setEditingCorridor(c);
    setEditStatus(c.status);
    setEditRate(c.usdcRate);
    setEditMin(c.minAmount);
    setEditMax(c.maxAmount);
  };

  const handleSaveCorridor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCorridor) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/corridors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCorridor.id,
          status: editStatus,
          usdcRate: editRate,
          minAmount: editMin,
          maxAmount: editMax,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingCorridor(null);
        await fetchCorridors();
      } else {
        alert(data.error || "Save failed");
      }
    } catch {
      alert("Error saving corridor");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-2">
              <Layers className="w-3.5 h-3.5" />
              Corridor administration
            </div>
            <h1 className="text-3xl font-extrabold text-white">Routes on / off</h1>
            <p className="text-xs text-slate-400">
              Each route is one country + one local payment method → Bolivia. Turn routes on or off,
              set rates and limits. Turning a route off never deletes past transfers.
            </p>
          </div>

          <button
            onClick={fetchCorridors}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Corridors</span>
          </button>
        </div>

        {/* Corridors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {corridors.map((c) => {
            const isActive = c.status === "ACTIVE";
            const isComingSoon = c.status === "COMING_SOON";

            return (
              <div
                key={c.id}
                className="p-6 rounded-3xl bg-[#0F162E] border border-violet-900/40 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {c.fromCountry === "Nigeria"
                          ? "🇳🇬"
                          : c.fromCountry === "Ghana"
                          ? "🇬🇭"
                          : c.fromCountry === "Kenya"
                          ? "🇰🇪"
                          : "🇿🇦"}
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {c.fromCountry} → {c.toCountry}
                        </h2>
                        <span className="text-xs font-mono text-slate-400">
                          Currency: <strong className="text-white">{c.fromCurrency}</strong> → {c.toCurrency}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : isComingSoon
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isActive ? "Available" : isComingSoon ? "Coming soon" : c.status}
                    </span>
                  </div>

                  {/* Corridor Specs Grid */}
                  <div className="grid grid-cols-2 gap-3 py-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 font-sans block">Rail:</span>
                      <span className="text-white font-semibold">
                        {c.fromCountry === "Nigeria"
                          ? "Bank transfer, P2P"
                          : c.fromCountry === "Ghana"
                          ? "Mobile money"
                          : c.fromCountry === "Kenya"
                          ? "Mobile money"
                          : "Instant EFT, Bank"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block">Provider:</span>
                      <span className="text-slate-200">
                        {c.providers && c.providers.length > 0
                          ? c.providers[0].name
                          : "Not configured"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block">Mode:</span>
                      <span className="text-emerald-400">Sandbox</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block">Exchange Rate:</span>
                      <span className="text-white font-bold">
                        1 USDC = {c.usdcRate} {c.fromCurrency}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block">Limits:</span>
                      <span className="text-slate-300">
                        {c.minAmount} – {c.maxAmount} {c.fromCurrency}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-sans block">Verification:</span>
                      <span className="text-slate-300">
                        {c.providers && c.providers.length > 0
                          ? c.providers[0].verificationMethod
                          : "Operator sandbox"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-800/60">
                    {c.description}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                  <span className="text-xs font-mono text-slate-500">
                    Health: <strong className="text-emerald-400">Operational</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Modal */}
        {editingCorridor && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#0F162E] border border-violet-900/60 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-white text-base">
                  Manage Corridor: {editingCorridor.id}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCorridor(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCorridor} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="ACTIVE">ACTIVE (Available)</option>
                    <option value="COMING_SOON">COMING_SOON</option>
                    <option value="MAINTENANCE">MAINTENANCE (Offline)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Rate ({editingCorridor.fromCurrency} per USDC)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Min Amount</label>
                    <input
                      type="number"
                      required
                      value={editMin}
                      onChange={(e) => setEditMin(e.target.value)}
                      className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Max Amount</label>
                    <input
                      type="number"
                      required
                      value={editMax}
                      onChange={(e) => setEditMax(e.target.value)}
                      className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCorridor(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

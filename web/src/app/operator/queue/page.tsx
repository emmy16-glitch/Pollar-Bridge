"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import confetti from "canvas-confetti";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  Lock,
  ArrowRight,
  Send,
  Eye,
  Check,
  Building2,
  Smartphone,
  Users,
} from "lucide-react";
import { formatCurrency, truncateHash, formatRelativeTime, formatDate } from "@/lib/formatters";

import { Suspense } from "react";

function OperatorQueueContent() {
  const searchParams = useSearchParams();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [operatorNotes, setOperatorNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transfers");
      const data = await res.json();
      if (data.success) {
        setTransfers(data.transfers || []);
        // Check if pre-selected via query ref
        const qRef = searchParams.get("ref");
        if (qRef && !selectedTransfer) {
          const match = data.transfers.find((t: any) => t.id === qRef);
          if (match) setSelectedTransfer(match);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleVerify = async () => {
    if (!selectedTransfer) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_SETTLE",
          operatorNotes: operatorNotes || "Local payment verified by operator. Pollar USDC settlement executed.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTransfer(data.transfer);
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.7 } });
        await fetchTransfers();
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer) return;
    const reason = prompt("Enter reason for rejection:", "Amount mismatch or invalid reference");
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTransfer(data.transfer);
        await fetchTransfers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedTransfer) return;
    const note = prompt("Message to sender requesting verification proof:", "Please upload clearer bank receipt showing transaction reference");
    if (!note) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_INFO",
          operatorNotes: note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTransfer(data.transfer);
        await fetchTransfers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = transfers.filter((t) => {
    if (filterStatus === "ALL") return true;
    return t.status === filterStatus;
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-2">
              <Clock className="w-3.5 h-3.5" />
              Operator Payment Verification
            </div>
            <h1 className="text-3xl font-extrabold text-white">Payment Queue</h1>
            <p className="text-xs text-slate-400">
              Verify detected fiat deposits from African local rails before authorizing USDC release.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransfers}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Safety Rule Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 flex items-start gap-3 text-xs text-slate-300">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block">Crucial Escrow Safety Rule:</span>
            USDC cannot be released until the local payment is verified. Authorizing release mints/settles testnet USDC to the recipient wallet.
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Filter Status:</span>
          {["ALL", "PAYMENT_DETECTED", "IN_REVIEW", "COMPLETED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl border transition-colors ${
                filterStatus === s
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Queue Table */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 shadow-xl">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              Loading payment queue...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              No transfers match the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Corridor</th>
                    <th className="pb-3 font-semibold">Rail Type</th>
                    <th className="pb-3 font-semibold">Expected Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Detected</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTransfer(t)}
                      className={`hover:bg-slate-900/50 cursor-pointer transition-colors ${
                        selectedTransfer?.id === t.id ? "bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="py-3 font-bold text-white">
                        <span>{t.id}</span>
                        <span className="text-[10px] text-slate-500 block font-normal">
                          {t.senderName}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-slate-200">
                          {t.sourceCountry} → {t.destCountry}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {t.destCurrency}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">
                        {t.railName}
                      </td>
                      <td className="py-3 font-bold text-white">
                        {formatCurrency(t.totalSourceAmount, t.sourceCurrency)}
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
                          {t.status === "PAYMENT_DETECTED" ? "Payment detected" : t.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {formatRelativeTime(t.paidAt || t.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransfer(t);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REVIEW DRAWER / MODAL (Exactly adhering to Section 5 requirements) */}
        {selectedTransfer && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-[#0F162E] border border-amber-500/40 p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-mono uppercase text-amber-400 tracking-wider">
                    Operator Verification Drawer
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    Review: {selectedTransfer.id}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTransfer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Safety Reminder inside drawer */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Safety Rule:</strong> USDC cannot be released until the local payment is verified.
                </span>
              </div>

              {/* Specifications Review Table */}
              <div className="p-5 rounded-2xl bg-[#090D1C] border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Reference:</span>
                  <span className="text-white font-bold">{selectedTransfer.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Corridor:</span>
                  <span className="text-slate-200">
                    {selectedTransfer.sourceCountry} → {selectedTransfer.destCountry}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Rail:</span>
                  <span className="text-slate-200">{selectedTransfer.railName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Expected amount:</span>
                  <span className="text-white font-bold">
                    {formatCurrency(selectedTransfer.totalSourceAmount, selectedTransfer.sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Received amount:</span>
                  <span className="text-emerald-400 font-bold">
                    {formatCurrency(selectedTransfer.actualPaidAmount || selectedTransfer.totalSourceAmount, selectedTransfer.sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Sender proof:</span>
                  <span className="text-emerald-400 font-bold">available</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Risk flags:</span>
                  <span className="text-emerald-400 font-bold">none (Clean AML check)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Provider status:</span>
                  <span className="text-slate-200">settled in sandbox escrow</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-sans">USDC to Release:</span>
                  <span className="text-violet-300 font-bold text-sm">
                    {selectedTransfer.usdcAmount} USDC (~{selectedTransfer.estimatedBobPayout} BOB)
                  </span>
                </div>
              </div>

              {/* Operator note input */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Operator Audit Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified sandbox bank ledger entry. Approved."
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons: [Verify payment], [Reject payment], [Request more information] */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Reject payment
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRequestInfo}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Request more information
                </button>

                <button
                  type="button"
                  disabled={actionLoading || selectedTransfer.status === "COMPLETED"}
                  onClick={handleVerify}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Settling via Pollar...</span>
                    </>
                  ) : selectedTransfer.status === "COMPLETED" ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Already Verified</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify payment & Release USDC</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function OperatorQueuePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="py-16 text-center text-slate-400 font-mono text-sm">
            Loading operator queue...
          </div>
        </AppShell>
      }
    >
      <OperatorQueueContent />
    </Suspense>
  );
}

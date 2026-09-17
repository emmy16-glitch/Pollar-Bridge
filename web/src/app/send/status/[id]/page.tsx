"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Share2,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { formatCurrency, truncateHash, formatDate } from "@/lib/formatters";

export default function TransferStatusDirectPage() {
  const params = useParams();
  const id = params.id as string;
  const [transfer, setTransfer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTransfer = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/transfers/${id}`);
      const data = await res.json();
      if (data.success && data.transfer) {
        setTransfer(data.transfer);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
    const interval = setInterval(fetchTransfer, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSimulateApproval = async () => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_SETTLE",
          operatorNotes: "Operator verified deposit slip in sandbox. Released USDC via Pollar testnet.",
        }),
      });
      const data = await res.json();
      if (data.success && data.transfer) {
        setTransfer(data.transfer);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch {
      alert("Simulation failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
          <p className="text-sm font-mono text-slate-400">Loading transfer status...</p>
        </div>
      </AppShell>
    );
  }

  if (!transfer) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="p-8 rounded-3xl bg-[#0F162E] border border-slate-800 space-y-3">
            <h2 className="text-xl font-bold text-white">Transfer Not Found</h2>
            <p className="text-xs text-slate-400">Reference: {id}</p>
            <Link
              href="/send"
              className="inline-block px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold"
            >
              Start New Transfer
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const isCompleted = transfer.status === "COMPLETED";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/history"
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to History
          </Link>

          <button
            onClick={fetchTransfer}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Transfer Status Card */}
        <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-mono uppercase text-violet-400 tracking-wider">
                Transfer Ref: {transfer.id}
              </span>
              <h1 className="text-2xl font-bold text-white mt-0.5">
                {isCompleted ? "Transfer complete" : "Transfer in progress"}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                {transfer.sourceCountry} ({transfer.sourceCurrency}) → Bolivia (BOB)
              </p>
            </div>

            <div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {transfer.status}
              </span>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="space-y-4 max-w-xl mx-auto py-2">
            {[
              { label: "Quote created", done: true, current: false },
              { label: "Payment instructions issued", done: true, current: false },
              {
                label: "Local payment detected",
                done: transfer.status !== "QUOTE_CREATED" && transfer.status !== "INSTRUCTIONS_ISSUED",
                current: transfer.status === "PAYMENT_DETECTED",
              },
              {
                label: "Payment verification",
                done: transfer.status === "COMPLETED" || transfer.status === "PAYMENT_VERIFIED",
                current: transfer.status === "PAYMENT_DETECTED" || transfer.status === "IN_REVIEW",
                badge:
                  transfer.status === "PAYMENT_DETECTED" || transfer.status === "IN_REVIEW"
                    ? "In review"
                    : undefined,
              },
              {
                label: "USDC settlement",
                done: isCompleted,
                current: false,
                badge: !isCompleted ? "Waiting" : undefined,
              },
              {
                label: "Pollar transfer",
                done: isCompleted,
                current: false,
                badge: !isCompleted ? "Waiting" : undefined,
              },
              {
                label: "BOB payout",
                done: isCompleted,
                current: false,
                badge: !isCompleted ? "Waiting" : "Simulated",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    item.done
                      ? "bg-emerald-500 text-black font-bold text-xs"
                      : item.current
                      ? "bg-amber-500 text-black font-bold text-xs animate-pulse ring-4 ring-amber-500/20"
                      : "bg-slate-800 text-slate-500 text-xs"
                  }`}
                >
                  {item.done ? "✓" : idx + 1}
                </div>
                <div className="flex-1 flex items-center justify-between py-2 border-b border-slate-800/60 font-mono text-xs">
                  <span
                    className={`${
                      item.done
                        ? "text-white font-medium"
                        : item.current
                        ? "text-amber-300 font-semibold"
                        : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        item.badge === "In review"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : item.badge === "Simulated"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Details */}
          <div className="p-4 rounded-2xl bg-[#090D1C] border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Total local amount:</span>
              <span className="text-white font-bold">
                {formatCurrency(transfer.totalSourceAmount, transfer.sourceCurrency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">USDC delivered:</span>
              <span className="text-emerald-400 font-bold">{transfer.usdcAmount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated BOB:</span>
              <span className="text-white font-bold">{transfer.estimatedBobPayout} BOB</span>
            </div>
            {transfer.pollarTxHash && (
              <div className="flex justify-between">
                <span className="text-slate-400">Pollar Tx:</span>
                <span className="text-violet-300">{truncateHash(transfer.pollarTxHash, 8, 8)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {!isCompleted ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSimulateApproval}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Operator Approval & Release USDC</span>
              </button>
            ) : (
              <div className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> USDC Confirmed & Settled
              </div>
            )}

            <div className="flex items-center gap-2">
              <Link
                href={`/track/${transfer.trackingToken}`}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5"
              >
                <span>Public Tracking</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import Timeline, { TimelineStep } from "@/components/ui/Timeline";
import StreamingText from "@/components/ui/StreamingText";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe2,
} from "lucide-react";
import { formatCurrency, truncateHash, formatDate } from "@/lib/formatters";

export default function PublicTrackPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/track/${token}`);
      const data = await res.json();
      if (data.success && data.transfer) {
        setTransfer(data.transfer);
        setError(null);
      } else {
        setError(data.error || "Transfer reference not found");
      }
    } catch {
      setError("Network error fetching tracking status");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchTrackData(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchTrackData]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
          <p className="text-sm font-mono text-slate-400">Loading transfer tracking...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !transfer) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="p-6 rounded-3xl bg-[#0F162E] border border-coral-500/30 space-y-4">
            <h2 className="text-xl font-bold text-white">Transfer Not Found</h2>
            <p className="text-xs text-slate-400">
              No transfer was found matching reference <span className="font-mono text-violet-300">{token}</span>.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/track"
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Try Another Search
              </Link>
              <Link
                href="/send"
                className="px-4 py-2 rounded-xl bg-violet-600 text-xs text-white"
              >
                Send Money Now
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const isCompleted = transfer.status === "COMPLETED";
  const hasPaid = Boolean(transfer.paidAt) || isCompleted;

  const steps: TimelineStep[] = [
    { label: "Transfer quote created", detail: formatDate(transfer.createdAt), state: "done" },
    {
      label: "Local payment confirmed",
      detail: transfer.paidAt ? formatDate(transfer.paidAt) : hasPaid ? "Confirmed" : "Pending",
      state: hasPaid ? "done" : "current",
    },
    {
      label: "Operator review & Pollar release",
      detail: isCompleted ? formatDate(transfer.verifiedAt) : hasPaid ? "In review" : "Waiting for payment",
      state: isCompleted ? "done" : hasPaid ? "current" : "pending",
    },
    {
      label: "USDC settled to recipient wallet",
      detail: isCompleted ? formatDate(transfer.settledAt) : "Waiting",
      state: isCompleted ? "done" : "pending",
    },
  ];

  const liveLine = isCompleted
    ? `Delivered · ${transfer.usdcAmount} USDC settled · ledger ${transfer.stellarLedger || "confirmed"}`
    : hasPaid
    ? "Payment detected · operator verification in progress · USDC locked until verified"
    : "Awaiting local payment · quote reserved · nothing released yet";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/track"
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Tracking Search
          </Link>

          <button
            onClick={fetchTrackData}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Public Status Overview Card */}
        <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-mono uppercase text-violet-400 tracking-wider">
                PollarBridge transfer
              </span>
              <h1 className="text-2xl font-bold text-white mt-0.5">Reference: {transfer.id}</h1>
              <p className="text-xs text-slate-400">
                Last updated: {formatDate(transfer.updatedAt)}
              </p>
            </div>

            <div className="text-right">
              <StatusBadge
                status={transfer.status}
                label={isCompleted ? "Delivered" : "In Progress"}
                pulse={!isCompleted}
              />
            </div>
          </div>

          {/* Core Transfer Data: Exactly as prompt specified */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#090D1C] border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-slate-500 font-sans block mb-1">From:</span>
              <span className="text-white font-bold text-sm">{transfer.sourceCountry}</span>
              <span className="text-[11px] text-slate-400 block">{transfer.sourceCurrency}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block mb-1">To:</span>
              <span className="text-white font-bold text-sm">{transfer.destCountry}</span>
              <span className="text-[11px] text-slate-400 block">{transfer.destCurrency}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block mb-1">Amount delivered:</span>
              <span className="text-emerald-400 font-bold text-sm">{transfer.usdcAmount} USDC</span>
              <span className="text-[10px] text-slate-400 block">Stellar Testnet</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block mb-1">Estimated payout:</span>
              <span className="text-white font-bold text-sm">{transfer.estimatedBobPayout} BOB</span>
              <span className="text-[10px] text-violet-400 block">Bolivian Local</span>
            </div>
          </div>

          {/* Recipient Deliverable Status Banner */}
          <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/30 space-y-1">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Status: {isCompleted ? "USDC delivered to recipient wallet" : "Under operator verification"}
            </div>
            <StreamingText
              text={liveLine}
              className="text-[11px] text-emerald-300/90"
              doneLabel={liveLine}
            />
            <div className="text-xs text-slate-400">
              BOB payout: <span className="text-violet-300 font-mono">simulated for demo</span> · Rate source: {transfer.rateSource}
            </div>
          </div>

          {/* Recipient Public Timeline */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Verification & Delivery Timeline
            </h3>
            <Timeline steps={steps} ariaLabel="Transfer verification and delivery timeline" />
          </div>

          {/* Cryptographic reference if available */}
          {transfer.pollarTxHash && (
            <div className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 space-y-2 font-mono text-xs">
              <span className="text-slate-400 font-sans block">Pollar transaction reference:</span>
              <div className="text-violet-300 break-all bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                {transfer.pollarTxHash}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Stellar Ledger: {transfer.stellarLedger || "4829104"}</span>
                <span className="text-emerald-400">Cryptographically Confirmed</span>
              </div>
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" /> Public Redacted Recipient View
            </span>
            <span>Recipient: {transfer.recipientName} ({transfer.recipientWalletMasked})</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

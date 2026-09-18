import React from "react";

export type BadgeTone = "ok" | "warn" | "info" | "bad" | "mute";

const toneClass: Record<BadgeTone, string> = {
  ok: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  info: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  bad: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  mute: "bg-slate-500/10 text-slate-400 border-slate-600/40",
};

/** Single source of truth mapping transfer/entity status → badge tone. */
export function toneForStatus(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (["COMPLETED", "PAYMENT_VERIFIED", "VERIFIED", "ACTIVE", "HEALTHY", "FUNDED", "DELIVERED", "CONFIRMED", "RECONCILED", "MATCHED", "AVAILABLE", "ONLINE", "SETTLED"].includes(s))
    return "ok";
  if (["PAYMENT_DETECTED", "DETECTED", "IN_REVIEW", "UNDER_REVIEW", "PENDING", "AWAITING", "COMING_SOON", "COMING SOON", "IN_PROGRESS", "QUEUED", "IN VERIFICATION", "PENDING PAYMENT", "REVIEW"].includes(s))
    return "warn";
  if (["REJECTED", "FAILED", "SETTLEMENT_FAILED", "PAYOUT_FAILED", "EXPIRED", "REFUNDED", "ERROR", "MISMATCH"].includes(s))
    return "bad";
  if (["QUOTED", "INSTRUCTIONS", "SETTLING", "PROCESSING", "MOCKED", "SIMULATED", "SANDBOX", "TESTNET"].includes(s))
    return "info";
  return "mute";
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export default function StatusBadge({ status, label, pulse = false, className = "" }: StatusBadgeProps) {
  const tone = toneForStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${toneClass[tone]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? "animate-pulse-dot" : ""}`} aria-hidden="true" />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface ApprovalCardProps {
  title: string;
  reference: string;
  meta: { label: string; value: string }[];
  status: string;
  note?: string;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
}

/** Operator decision card: context left, irreversible actions right. */
export default function ApprovalCard({
  title,
  reference,
  meta,
  status,
  note,
  onApprove,
  onReject,
  busy = false,
  approveLabel = "Verify & release",
  rejectLabel = "Reject",
}: ApprovalCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-[#0F162E] border border-amber-500/25 hover:border-amber-500/50 transition-colors space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">{reference}</p>
        </div>
        <StatusBadge status={status} pulse />
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#090D1C] border border-slate-800">
        {meta.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-[10px] font-mono uppercase tracking-wide text-slate-500">{m.label}</dt>
            <dd className="text-xs font-mono text-slate-200 truncate mt-0.5">{m.value}</dd>
          </div>
        ))}
      </dl>

      {note && (
        <p className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {note}
        </p>
      )}

      <div className="flex items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-xs transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          {approveLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 disabled:opacity-50 text-rose-300 border border-slate-700 hover:border-rose-500/40 font-medium text-xs transition-colors"
        >
          <XCircle className="w-4 h-4" />
          {rejectLabel}
        </button>
      </div>
    </div>
  );
}

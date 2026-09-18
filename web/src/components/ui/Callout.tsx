import React from "react";
import { Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export type CalloutTone = "info" | "warn" | "ok" | "bad";

const toneClass: Record<CalloutTone, string> = {
  info: "bg-violet-500/10 border-violet-500/30 text-violet-200",
  warn: "bg-amber-500/10 border-amber-500/30 text-amber-200",
  ok: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
  bad: "bg-rose-500/10 border-rose-500/30 text-rose-200",
};

const toneIcon: Record<CalloutTone, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  ok: CheckCircle2,
  bad: XCircle,
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Plain-language explainer box. Used at the top of every staff page so a
 * non-operator knows what they are looking at before they touch anything.
 */
export default function Callout({ tone = "info", title, children, className = "" }: CalloutProps) {
  const Icon = toneIcon[tone];
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl border text-xs leading-relaxed ${toneClass[tone]} ${className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-0.5 min-w-0">
        {title && <p className="font-semibold text-white/90">{title}</p>}
        <div className="text-[11px] opacity-90">{children}</div>
      </div>
    </div>
  );
}
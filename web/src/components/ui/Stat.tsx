import React from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export type StatTone = "violet" | "emerald" | "amber" | "rose" | "slate";

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  spark?: number[];
  href?: string;
}

const valueTone: Record<StatTone, string> = {
  violet: "text-violet-300",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  slate: "text-white",
};

const borderTone: Record<StatTone, string> = {
  violet: "border-violet-900/40 hover:border-violet-500/60",
  emerald: "border-emerald-500/25 hover:border-emerald-500/50",
  amber: "border-amber-500/30 hover:border-amber-500/60",
  rose: "border-rose-500/25 hover:border-rose-500/50",
  slate: "border-slate-800 hover:border-slate-600",
};

/** Metric card with CSS-only sparkline bars and a delta line. */
export default function Stat({
  label,
  value,
  hint,
  tone = "slate",
  delta,
  deltaDirection = "flat",
  spark,
  href,
}: StatProps) {
  const DeltaIcon = deltaDirection === "up" ? TrendingUp : deltaDirection === "down" ? TrendingDown : Minus;
  const max = spark && spark.length > 0 ? Math.max(...spark, 1) : 1;

  const body = (
    <>
      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide truncate">{label}</div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${valueTone[tone]}`}>{value}</div>
      <div className="flex items-end justify-between gap-2 min-h-[28px]">
        <div className="text-[11px] text-slate-500 leading-snug">
          {delta && (
            <span className="inline-flex items-center gap-1 font-mono mr-1.5 text-slate-300">
              <DeltaIcon className="w-3 h-3" />
              {delta}
            </span>
          )}
          {hint}
        </div>
        {spark && spark.length > 0 && (
          <div className="flex items-end gap-[3px] h-7 shrink-0" aria-hidden="true">
            {spark.map((v, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-sm ${valueTone[tone]} opacity-70 bg-current`}
                style={{ height: `${Math.max(12, Math.round((v / max) * 100))}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  const cls = `p-4 rounded-2xl bg-[#0F162E] border transition-all space-y-1.5 ${borderTone[tone]}`;
  return href ? (
    <Link href={href} className={`${cls} block group`}>
      {body}
      <span className="text-[10px] font-mono text-slate-500 group-hover:text-violet-300 transition-colors">
        Open filtered view →
      </span>
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

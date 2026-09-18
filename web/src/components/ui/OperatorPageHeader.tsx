import React from "react";

interface OperatorPageHeaderProps {
  /** Zone label, mono + uppercase, e.g. "Staff zone · needs you now". */
  eyebrow: string;
  title: string;
  description: string;
  /** Right-hand actions (refresh buttons, etc). */
  actions?: React.ReactNode;
  /** Optional plain-language explainer rendered under the header. */
  children?: React.ReactNode;
}

/**
 * One header shape for every staff page: zone → what the page is → what you do
 * here → explainer → actions. Keeps /operator/* structurally identical so the
 * area reads as one product instead of six different screens.
 */
export default function OperatorPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: OperatorPageHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot" aria-hidden="true" />
            {eyebrow}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
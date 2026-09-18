"use client";

import React from "react";
import { Check } from "lucide-react";

export interface TimelineStep {
  label: string;
  detail?: string;
  state: "done" | "current" | "pending";
}

interface TimelineProps {
  steps: TimelineStep[];
  ariaLabel?: string;
}

/** Vertical checklist timeline: done / current / pending. */
export default function Timeline({ steps, ariaLabel = "Progress timeline" }: TimelineProps) {
  return (
    <ol className="space-y-1" aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3" aria-current={step.state === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center" aria-hidden="true">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 font-mono ${
                  step.state === "done"
                    ? "bg-emerald-500 text-black"
                    : step.state === "current"
                    ? "bg-amber-500 text-black animate-pulse-dot"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {step.state === "done" ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </div>
              {!isLast && (
                <span
                  className={`w-px flex-1 min-h-[14px] ${step.state === "done" ? "bg-emerald-500/40" : "bg-slate-800"}`}
                />
              )}
            </div>
            <div className={`flex-1 flex items-baseline justify-between gap-3 pb-4 ${isLast ? "pb-0" : ""}`}>
              <div>
                <p
                  className={`text-xs font-medium ${
                    step.state === "done"
                      ? "text-slate-200"
                      : step.state === "current"
                      ? "text-amber-300"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
                {step.detail && <p className="text-[11px] text-slate-500 font-mono mt-0.5">{step.detail}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

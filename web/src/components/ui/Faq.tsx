"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-[#0D1326] overflow-hidden">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors"
            >
              <span className={`text-sm font-medium ${isOpen ? "text-white" : "text-slate-300"}`}>{item.q}</span>
              <span
                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                  isOpen
                    ? "bg-violet-600/20 border-violet-500/40 text-violet-300 rotate-45"
                    : "bg-slate-800/60 border-slate-700 text-slate-400"
                }`}
              >
                <Plus className="w-4 h-4" />
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-xs text-slate-400 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

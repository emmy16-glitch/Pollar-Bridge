"use client";

import React from "react";
import { CornerDownLeft, Search } from "lucide-react";

interface AgentInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonLabel?: string;
  hints?: string[];
  onHintClick?: (hint: string) => void;
}

/** Command-style input: mono field, submit key hint, shortcut chips below. */
export default function AgentInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a reference…",
  buttonLabel = "Run",
  hints = [],
  onHintClick,
}: AgentInputProps) {
  return (
    <div className="space-y-2.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="rounded-2xl bg-[#0F162E] border border-violet-900/40 focus-within:border-violet-500/70 p-2 shadow-2xl flex items-center gap-2 transition-colors"
      >
        <Search className="w-5 h-5 text-violet-400 ml-3 shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-mono min-w-0"
        />
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-400 shrink-0">
          <CornerDownLeft className="w-3 h-3" /> Enter
        </kbd>
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors shrink-0"
        >
          {buttonLabel}
        </button>
      </form>
      {hints.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
          <span className="text-slate-500">Try:</span>
          {hints.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onHintClick?.(h)}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-violet-950 border border-slate-700 hover:border-violet-500/40 text-slate-300 hover:text-violet-200 transition-colors"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

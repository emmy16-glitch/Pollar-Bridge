"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import AgentInput from "@/components/ui/AgentInput";
import StatusBadge from "@/components/ui/StatusBadge";
import { ShieldCheck } from "lucide-react";

interface RecentTransfer {
  id: string;
  sourceCountry: string;
  destCountry: string;
  status: string;
}

export default function TrackSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentTransfer[]>([]);

  // Live recent transfers (replaces the old hardcoded demo list)
  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch("/api/transfers");
        const data = await res.json();
        if (data.success && Array.isArray(data.transfers)) {
          setRecent(data.transfers.slice(0, 4));
        }
      } catch {
        // keep empty — search box still works
      }
    }
    loadRecent();
  }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono">
            Public Recipient Tracking
          </div>
          <h1 className="text-3xl font-extrabold text-white">Track a Transfer</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Check live cross-border status using your PollarBridge reference ID or tracking token. No login required.
          </p>
        </div>

        {/* Lookup Box — search-first hero pattern */}
        <AgentInput
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            if (!query.trim()) return;
            router.push(`/track/${query.trim().toUpperCase()}`);
          }}
          placeholder="Enter transfer ID e.g. PB-1A2B3C4D"
          buttonLabel="Track Now"
          hints={recent.map((t) => t.id).slice(0, 3)}
          onHintClick={(hint) => {
            const match = recent.find((t) => t.id === hint);
            router.push(`/track/${(match?.id ?? hint).toUpperCase()}`);
          }}
        />

        {/* Quick Recent Transfers List */}
        {recent.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#0A0E1F] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Recent Transfers
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Click to inspect</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recent.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => router.push(`/track/${t.id}`)}
                className="p-3 rounded-xl bg-[#0F162E] hover:bg-[#152042] border border-slate-800 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-violet-300 block group-hover:text-violet-200">
                    {t.id}
                  </span>
                  <span className="text-[11px] text-slate-400">{t.sourceCountry} → {t.destCountry}</span>
                </div>
                <StatusBadge status={t.status} />
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Privacy & Safe Public Guarantee */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300 block">Recipient Privacy Guarantee:</span>
            Public tracking shows transfer timeline, USDC delivery, and transaction hashes only. Personal banking data and operator credentials are never exposed publicly.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

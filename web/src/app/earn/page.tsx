"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import SectionHeading from "@/components/ui/SectionHeading";
import StatusBadge from "@/components/ui/StatusBadge";
import Stat from "@/components/ui/Stat";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { Sprout, RefreshCw } from "lucide-react";

type Opp = { id?: string; provider?: string; asset?: string; apy?: string; apys?: unknown; tvl?: unknown; note?: string; vault?: string; pool?: string; [k: string]: unknown };
type EarnResp = { mode?: string; opportunities?: Opp[]; note?: string };

export default function EarnPage() {
  const [provider, setProvider] = useState<"blend" | "defindex">("blend");
  const [data, setData] = useState<EarnResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const load = async (p: "blend" | "defindex") => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/earn/opportunities?provider=${p}`, { cache: "no-store" });
      const j = (await r.json()) as EarnResp;
      setData(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "fetch failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(provider); }, [provider]);
  const opps = data?.opportunities ?? [];
  const real = data?.mode === "real";
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-7">
        <SectionHeading eyebrow="Yield" title="Earn with Blend & DeFindex"
          description="Live APY when Pollar is reachable; otherwise honestly-labeled sandbox figures. Demo — not real yield unless marked live." />
        <div className="flex items-center gap-2 flex-wrap">
          {(["blend", "defindex"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setProvider(p)}
              className={`px-4 py-2 rounded-xl text-xs font-mono capitalize ${provider === p ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{p}</button>
          ))}
          <button type="button" onClick={() => load(provider)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-300">
            <RefreshCw className="w-3.5 h-3.5" /><span>Refresh</span>
          </button>
          {data && (<StatusBadge status={real ? "Active" : "SANDBOX"} label={real ? "live APY · real" : "sandbox APY · demo"} />)}
        </div>
        {err && (<p className="text-xs text-rose-300">Fetch failed: {err}</p>)}
        {loading ? (
          <p className="text-xs font-mono text-slate-500">Loading opportunities…</p>
        ) : opps.length === 0 ? (
          <EmptyState title="No opportunities" description="Pollar returned no vaults or pools for this provider right now." />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {opps.slice(0, 4).map((o, i) => (
                <Stat key={String(o.id ?? i)} label={String(o.asset ?? o.vault ?? o.pool ?? "pool")} value={String(o.apy ?? "—")} hint={real ? "live APY" : "demo — not real yield"} tone={real ? "emerald" : "violet"} />
              ))}
            </div>
            <DataTable
              caption="Yield opportunities"
              columns={[
                { key: "id", header: "Opportunity", mono: true },
                { key: "asset", header: "Asset", mono: true },
                { key: "apy", header: "APY", mono: true, align: "right" },
                { key: "mode", header: "Mode", mono: true },
              ]}
              rows={opps.map((o, i) => ({
                id: String(o.id ?? `opp-${i}`),
                asset: String(o.asset ?? o.vault ?? o.pool ?? provider),
                apy: String(o.apy ?? JSON.stringify(o.apys ?? "—")),
                mode: real ? "live · real" : "demo — not real yield",
              }))}
              rowKey={(r, i) => `${String(r.id)}-${i}`}
            />
            {!real && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
                <Sprout className="w-4 h-4" /><span>{data?.note ?? "sandbox APY — demo, not real yield."}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

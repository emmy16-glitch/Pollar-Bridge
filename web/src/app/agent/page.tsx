"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import SectionHeading from "@/components/ui/SectionHeading";
import StatusBadge from "@/components/ui/StatusBadge";
import AgentInput from "@/components/ui/AgentInput";
import Timeline from "@/components/ui/Timeline";
import StreamingText from "@/components/ui/StreamingText";
import { Zap, ArrowRight } from "lucide-react";

const randHex = () => Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export default function AgentPage() {
  const [corridorId, setCorridorId] = useState("NG-NGN-BANK-BO-USDC");
  const [ids, setIds] = useState<string[]>([]);
  const [amount, setAmount] = useState("100000");
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [qStatus, setQStatus] = useState<number | null>(null);
  const [payHash, setPayHash] = useState(randHex());
  const [transfer, setTransfer] = useState<Record<string, unknown> | null>(null);
  const [tStatus, setTStatus] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/corridors", { cache: "no-store" });
        const j = (await r.json()) as { corridors?: { backendCorridorIds?: string[] }[] };
        const all = (j.corridors ?? []).flatMap((c) => c.backendCorridorIds ?? []);
        if (all.length) { setIds(all); setCorridorId(all[0]); }
      } catch { /* default corridor */ }
    })();
  }, []);
  const step1 = async () => {
    setBusy(true); setTransfer(null); setTStatus(null);
    try {
      const r = await fetch("/api/agent/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corridorId, sourceAmount: Number(amount) }),
      });
      setQStatus(r.status); setQuote((await r.json()) as Record<string, unknown>);
    } catch (e) { setQuote({ error: e instanceof Error ? e.message : "failed" }); }
    finally { setBusy(false); }
  };
  const step2 = async () => {
    const memo = String(quote?.memo ?? "");
    if (!memo) return;
    setBusy(true);
    try {
      const r = await fetch("/api/agent/transfers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo, paymentHash: payHash }),
      });
      setTStatus(r.status); setTransfer((await r.json()) as Record<string, unknown>);
    } catch (e) { setTransfer({ error: e instanceof Error ? e.message : "failed" }); }
    finally { setBusy(false); }
  };
  const t = transfer as { reference?: string; shareToken?: string } | null;
  const href = t?.shareToken ? `/track/${t.shareToken}` : null;
  const opts = [...new Set([corridorId, ...ids])];
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-7">
        <SectionHeading eyebrow="x402 machine rail" title="Agent rail: quote then mint" description="Machines quote first (402 Payment Required), pay testnet USDC with the memo, then redeem it. Audit actor: agent." />
        <Timeline steps={[
          { label: "Step 1 - POST /api/agent/quote", detail: quote ? `HTTP ${qStatus}` : "quote-first, expect 402", state: quote ? "done" : "current" },
          { label: "Step 2 - pay + POST /api/agent/transfers", detail: transfer ? `HTTP ${tStatus}` : "redeem memo with 64-hex", state: transfer ? "done" : quote ? "current" : "pending" },
          { label: "Track + audit", detail: href ?? "link appears here", state: transfer && tStatus === 201 ? "done" : "pending" },
        ]} />
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#0F162E] border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-violet-300" />Step 1 - 402 quote</h3>
            <label className="text-xs text-slate-400 block">Corridor
              <select value={corridorId} onChange={(e) => setCorridorId(e.target.value)} className="mt-1 w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500">
                {opts.map((id) => (<option key={id} value={id}>{id}</option>))}
              </select>
            </label>
            <AgentInput value={amount} onChange={setAmount} onSubmit={step1} placeholder="Source amount, e.g. 100000" buttonLabel={busy ? "..." : "Quote"} />
            {quote && (
              <div className="space-y-2">
                <StreamingText text="402 Payment Required - pay testnet USDC with the memo, then redeem it." className="text-[11px] text-amber-300" />
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={qStatus === 402 ? "QUOTED" : String(qStatus ?? "PENDING")} label={`HTTP ${qStatus ?? "..."}`} pulse />
                  {typeof quote.priceUsdc !== "undefined" && (<span className="text-xs font-mono text-emerald-400">{String(quote.priceUsdc)} USDC</span>)}
                </div>
                <dl className="text-xs font-mono space-y-1 bg-[#080B14] border border-slate-800 rounded-xl p-3">
                  {["priceUsdc", "payTo", "memo", "expiresAt"].map((k) => (
                    <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-violet-200 break-all text-right">{String(quote[k] ?? "-")}</dd></div>
                  ))}
                </dl>
                <pre className="text-[10px] font-mono text-slate-400 bg-[#080B14] border border-slate-800 rounded-xl p-3 overflow-x-auto">{JSON.stringify(quote, null, 2)}</pre>
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-[#0F162E] border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ArrowRight className="w-4 h-4 text-emerald-300" />Step 2 - redeem hash</h3>
            <AgentInput value={payHash} onChange={setPayHash} onSubmit={step2} placeholder="64-hex payment hash" buttonLabel={busy ? "..." : "Mint transfer"} />
            <button type="button" onClick={() => setPayHash(randHex())} className="text-[11px] font-mono text-violet-300">new random 64-hex</button>
            {transfer && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={tStatus === 201 ? "COMPLETED" : String(tStatus ?? "PENDING")} label={tStatus === 201 ? "201 - minted" : `HTTP ${tStatus ?? "..."}`} />
                  <StatusBadge status="Active" label="audit actor agent" />
                </div>
                <pre className="text-[10px] font-mono text-slate-400 bg-[#080B14] border border-slate-800 rounded-xl p-3 overflow-x-auto">{JSON.stringify(transfer, null, 2)}</pre>
                {href && (<Link href={href} className="inline-block px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold">Open in /track</Link>)}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-[#0F162E] border border-slate-800 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white">Try it with curl</h3>
          <pre className="text-[11px] font-mono text-slate-300 bg-[#080B14] border border-slate-800 rounded-xl p-4 overflow-x-auto whitespace-pre">{"curl -i -X POST $BACKEND/api/agent/quote -H 'content-type: application/json' -d '{\"corridorId\":\"NG-NGN-BANK-BO-USDC\",\"sourceAmount\":100000}'\n# 402 PAYMENT_REQUIRED { priceUsdc, payTo, memo, expiresAt }\ncurl -X POST $BACKEND/api/agent/transfers -H 'content-type: application/json' -d '{\"memo\":\"PB-AGENT-...\",\"paymentHash\":\"<64-hex>\"}'\n# 201 transfer + audit actor agent"}</pre>
        </div>
      </div>
    </AppShell>
  );
}

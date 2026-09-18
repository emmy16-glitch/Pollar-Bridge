"use client";
import React, { useEffect, useState } from "react";
import { usePollar } from "@pollar/react";
import { LogIn, LogOut, ArrowDownUp, Send, ShieldCheck, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const hasKey = (process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ?? "") !== "";

function Inner() {
  const poll = usePollar();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("1.00");
  useEffect(() => {
    if (poll.isAuthenticated) {
      poll.refreshWalletBalance().catch(() => undefined);
      poll.refreshAssets().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll.isAuthenticated]);
  const balances = poll.walletBalance.step === "loaded" ? poll.walletBalance.data.balances : [];
  const usdc = balances.find((b) => b.code === "USDC") ?? null;
  const trust = async () => {
    setBusy("t"); setNote(null);
    try {
      const o = await poll.setTrustline({ code: "USDC", issuer: USDC_ISSUER });
      setNote(o.status === "success" || o.status === "pending"
        ? `USDC trustline submitted · hash ${(o.hash ?? "").slice(0, 12)}… (real SDK)`
        : `Trustline failed: ${o.details ?? "unknown"}`);
    } catch (e) { setNote(`Trustline failed: ${e instanceof Error ? e.message : "unknown"}`); }
    finally { setBusy(null); }
  };
  const send = async () => {
    setBusy("s"); setNote(null);
    try {
      if (!sendTo.trim() || !sendAmount.trim()) { setNote("Enter destination + amount first."); return; }
      const o = await poll.sendPayment({
        destination: sendTo.trim(), amount: sendAmount.trim(),
        asset: { type: "credit_alphanum4", code: "USDC", issuer: USDC_ISSUER },
      });
      setNote(o.status === "success" || o.status === "pending"
        ? `USDC send ${o.status} · hash ${o.hash.slice(0, 12)}… (real SDK)`
        : `SDK send unavailable in demo — ${o.details ?? o.resultCode ?? "no hash"}`);
    } catch (e) { setNote(`SDK send unavailable in demo — ${e instanceof Error ? e.message : "unknown"}`); }
    finally { setBusy(null); }
  };
  return (
    <div className="rounded-3xl bg-[#0F162E] border border-violet-500/30 p-6 sm:p-8 space-y-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-violet-400">Pollar wallet (real SDK)</p>
          <h2 className="text-lg font-bold text-white">Live Pollar wallet</h2>
          <p className="text-xs text-slate-400">Via <span className="font-mono">@pollar/react</span> — values labeled real vs demo.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={hasKey ? "TESTNET" : "SANDBOX"} label={hasKey ? "TESTNET · real SDK" : "SANDBOX · no key"} />
          <StatusBadge status={poll.isAuthenticated ? "Active" : "PENDING"} label={poll.isAuthenticated ? "real · connected" : "demo · not connected"} />
        </div>
      </div>

      {!hasKey && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          No key set — demo fallback. Sandbox card above stays usable.
        </p>
      )}
      {!poll.isAuthenticated ? (
        <button type="button" onClick={() => poll.openLoginModal()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs">
          <LogIn className="w-4 h-4" /><span>Connect Pollar wallet</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#080B14] border border-slate-800">
            <div className="min-w-0">
              <p className="text-[11px] font-mono text-slate-500">real · SDK wallet address</p>
              <p className="text-xs font-mono text-violet-200 break-all">{poll.wallet?.address}</p>
            </div>
            <button type="button" onClick={() => poll.logout()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 shrink-0">
              <LogOut className="w-3.5 h-3.5" /><span>Disconnect</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#080B14] border border-slate-800">
              <p className="text-[11px] font-mono text-slate-500">real · USDC (SDK)</p>
              <p className="text-xl font-bold font-mono text-emerald-400">{usdc?.balance ?? "—"}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#080B14] border border-slate-800">
              <p className="text-[11px] font-mono text-slate-500">real · balances (SDK)</p>
              <p className="text-xl font-bold font-mono text-white">{poll.walletBalance.step === "loaded" ? balances.length : "—"}</p>
              <p className="text-[10px] font-mono text-slate-500">state: {poll.walletBalance.step}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={trust} disabled={busy !== null} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50">
              {busy === "t" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}<span>Set USDC trustline</span>
            </button>
            <button type="button" onClick={() => poll.openRampModal()} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
              <ArrowDownUp className="w-3.5 h-3.5" /><span>Deposit / withdraw (ramp modal)</span>
            </button>
          </div>
          <div className="p-4 rounded-xl bg-[#080B14] border border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-white">Send via SDK (real)</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="Destination G… address" spellCheck={false} className="w-full bg-[#0F162E] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
              <input value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="Amount USDC" inputMode="decimal" className="w-full bg-[#0F162E] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
            </div>
            <button type="button" onClick={send} disabled={busy !== null} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50">
              {busy === "s" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}<span>Send USDC via SDK</span>
            </button>
            <p className="text-[11px] text-slate-500">Uses sendPayment; failures show honest SDK send unavailable in demo note.</p>
          </div>
        </div>
      )}
      {note && (<p className="text-xs font-mono text-slate-300 bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2" aria-live="polite">{note}</p>)}
    </div>
  );
}
class CardBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("Pollar wallet card fallback:", e); }
  render() {
    if (this.state.failed) {
      return (<div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-wider text-violet-400">Pollar wallet (real SDK)</p>
        <p className="text-xs text-slate-400">demo — SDK unavailable here. Sandbox card above stays usable.</p>
        <StatusBadge status="SANDBOX" label="demo — SDK unavailable" />
      </div>);
    }
    return this.props.children;
  }
}
export default function PollarWalletCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return (<div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 space-y-2">
      <p className="text-[11px] font-mono uppercase tracking-wider text-violet-400">Pollar wallet (real SDK)</p>
      <p className="text-xs text-slate-400">demo — loading SDK wallet…</p>
    </div>);
  }
  return (<CardBoundary><Inner /></CardBoundary>);
}


"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import SectionHeading from "@/components/ui/SectionHeading";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { ShieldCheck } from "lucide-react";

type Prov = { id?: string; name?: string; levels?: string[]; countries?: unknown; [k: string]: unknown };

export default function KycPage() {
  const [country, setCountry] = useState("NG");
  const [provs, setProvs] = useState<Prov[]>([]);
  const [mode, setMode] = useState("");
  const [note, setNote] = useState("");
  const [extId, setExtId] = useState("demo-user-001");
  const [email, setEmail] = useState("");
  const [reg, setReg] = useState<{ mode?: string; user?: { userId?: string } } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/kyc/providers?country=${country}`, { cache: "no-store" });
        const j = await r.json() as { mode?: string; providers?: Prov[]; note?: string };
        setProvs(j.providers ?? []); setMode(j.mode ?? "mock"); setNote(j.note ?? "");
      } catch { setProvs([]); setMode("mock"); }
    })();
  }, [country]);
  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/pollar/users/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: extId, ...(email ? { email } : {}) }),
    });
    setReg(await r.json());
  };
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-7">
        <SectionHeading eyebrow="Identity" title="Verify once, fund on approval"
          description="Deferred mapping: operator verify == funding trigger. Pollar holds the wallet unfunded until KYC passes, then releases it." />
        <div className="rounded-2xl bg-[#0F162E] border border-slate-800 p-5 space-y-4">
          <label className="text-xs text-slate-400 block">Country
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-48 bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-500">
              {(["NG", "GH", "KE", "ZA"] as const).map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </label>
          {provs.length === 0 ? (
            <EmptyState title="No KYC providers" description="No providers returned for this country. Operator verifies manually in sandbox." />
          ) : (
            <ul className="space-y-2">
              {provs.map((p, i) => (
                <li key={String(p.id ?? i)} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#080B14] border border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-violet-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{String(p.name ?? p.id)}</p>
                      <p className="text-[11px] font-mono text-slate-500">{Array.isArray(p.levels) ? p.levels.join(" · ") : ""} {p.id ? `· ${String(p.id)}` : ""}</p>
                    </div>
                  </div>
                  <StatusBadge status={mode === "real" ? "Active" : "SANDBOX"} label={mode === "real" ? "live · real" : "sandbox · demo"} />
                </li>
              ))}
            </ul>
          )}
          {note && (<p className="text-[11px] font-mono text-slate-500">{note}</p>)}
        </div>
        <div className="rounded-2xl bg-[#0F162E] border border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Register Pollar user</h3>
          <form onSubmit={register} className="grid sm:grid-cols-3 gap-3">
            <input value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="externalId" required className="bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email (optional)" className="bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold">Register</button>
          </form>
          {reg && (<p className="text-xs font-mono text-slate-300" aria-live="polite">mode: {String(reg.mode)} · userId: {String(reg.user?.userId ?? "—")}</p>)}
        </div>
      </div>
    </AppShell>
  );
}

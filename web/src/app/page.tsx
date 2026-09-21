"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  ArrowRight,
  ShieldCheck,
  Send,
  Search,
  Building2,
  Smartphone,
  Users,
  Lock,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Banknote,
  Wallet,
  Zap,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import StatusBadge from "@/components/ui/StatusBadge";
import Faq from "@/components/ui/Faq";

function BobQuoteBadge() {
  const [q, setQ] = useState<{ mode?: string; quote?: { estimatedAmount?: number; fee?: number }; quotes?: unknown } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/pollar/ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp", { cache: "no-store" });
        setQ((await r.json()) as { mode?: string; quote?: { estimatedAmount?: number; fee?: number } });
      } catch { setQ(null); }
    })();
  }, []);
  if (!q) return <StatusBadge status="PENDING" label="BOB quote…" />;
  const real = q.mode === "real";
  const amt = q.quote ? `≈ ${q.quote.estimatedAmount} BOB` : "live quotes";
  return (
    <span className="inline-flex items-center gap-2">
      <StatusBadge status={real ? "Active" : "SANDBOX"} label={real ? "live Pollar quote" : "sandbox"} />
      <span className="text-[11px] font-mono text-slate-400">100 USDC → {amt}</span>
    </span>
  );
}

const CORRIDORS = [
  {
    flag: "🇳🇬",
    from: "Nigeria",
    pair: "NGN → BOB",
    rate: "1 USDC ≈ 1,608.20 NGN",
    rails: "Bank transfer, P2P",
    speed: "5–15 min",
    href: "/send?country=NG",
    active: true,
  },
  {
    flag: "🇬🇭",
    from: "Ghana",
    pair: "GHS → BOB",
    rate: "1 USDC ≈ 15.42 GHS",
    rails: "MTN, Telecel Momo",
    speed: "5–10 min",
    href: "/send?country=GH",
    active: true,
  },
  {
    flag: "🇰🇪",
    from: "Kenya",
    pair: "KES → BOB",
    rate: "1 USDC ≈ 129.50 KES",
    rails: "M-Pesa paybill",
    speed: "Near-instant",
    href: "/send?country=KE",
    active: false,
  },
  {
    flag: "🇿🇦",
    from: "South Africa",
    pair: "ZAR → BOB",
    rate: "1 USDC ≈ 18.25 ZAR",
    rails: "Instant EFT, Ozow",
    speed: "10–25 min",
    href: "/send?country=ZA",
    active: false,
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Pick a route",
    text: "Choose your country and the fastest local rail for your amount.",
  },
  {
    icon: Banknote,
    title: "Pay with reference",
    text: "Send the exact amount and quote your PB-… code so we can match it.",
  },
  {
    icon: ShieldCheck,
    title: "We verify",
    text: "An operator confirms the deposit before anything moves on-chain.",
  },
  {
    icon: Wallet,
    title: "They receive",
    text: "USDC settles on Stellar testnet and pays out as BOB in Bolivia.",
  },
];

export default function LandingPage() {
  const [calcSourceAmount, setCalcSourceAmount] = useState<number>(100000);
  const [calcCountry, setCalcCountry] = useState<"NG" | "GH" | "KE" | "ZA">("NG");

  const rates: Record<string, { currency: string; rate: number; name: string; bobRate: number }> = {
    NG: { currency: "NGN", rate: 1608.2, name: "Nigeria", bobRate: 6.96 },
    GH: { currency: "GHS", rate: 15.42, name: "Ghana", bobRate: 6.96 },
    KE: { currency: "KES", rate: 129.5, name: "Kenya", bobRate: 6.96 },
    ZA: { currency: "ZAR", rate: 18.25, name: "South Africa", bobRate: 6.96 },
  };

  const selectedRate = rates[calcCountry];
  const estUsdc = (calcSourceAmount / selectedRate.rate).toFixed(2);
  const estBob = (parseFloat(estUsdc) * selectedRate.bobRate).toFixed(2);

  return (
    <AppShell>
      <div className="px-4 lg:px-12 py-8 max-w-6xl mx-auto space-y-16 sm:space-y-20">
        {/* ---------- HERO ---------- */}
        <section className="relative pt-4 lg:pt-8 overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-violet-600/15 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute top-24 right-0 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative text-center max-w-2xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" aria-hidden="true" />
              TESTNET DEMO · SANDBOX MODE
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              Send money from{" "}
              <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Africa to Bolivia
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Pay locally with bank transfer or mobile money. We verify every payment,
              settle USDC on Stellar testnet, and pay out BOB on the other side.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link
                href="/send"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.02]"
              >
                <Send className="w-4 h-4" />
                <span>Send money</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F162E] hover:bg-[#152042] text-slate-200 hover:text-white font-medium text-sm border border-violet-900/40 transition-all"
              >
                <Search className="w-4 h-4 text-violet-400" />
                <span>Track a transfer</span>
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F162E] hover:bg-[#152042] text-violet-200 hover:text-white font-medium text-sm border border-violet-500/40 transition-all"
              >
                <Zap className="w-4 h-4 text-violet-300" />
                <span>Agent rail (x402)</span>
              </Link>
            </div>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              How it works
              <ChevronDown className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Money path — one compact strip instead of three boxes */}
          <div className="relative mt-8 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 p-3 rounded-2xl bg-[#0D1326]/80 border border-violet-900/30 backdrop-blur-md">
              {[
                { icon: Banknote, title: "You pay locally", text: "NGN · GHS · KES · ZAR" },
                { icon: ShieldCheck, title: "We verify & settle", text: "USDC on Stellar" },
                { icon: Wallet, title: "They receive BOB", text: "Bolivian payout" },
              ].map((s, i) => (
                <React.Fragment key={s.title}>
                  {i > 0 && (
                    <div className="hidden sm:flex items-center px-1 text-violet-500/60" aria-hidden="true">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <s.icon className="w-5 h-5 text-violet-300 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{s.title}</p>
                      <p className="text-[11px] font-mono text-slate-400">{s.text}</p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Estimator */}
          <div className="relative mt-6 max-w-xl mx-auto rounded-2xl bg-[#0F162E]/90 border border-violet-900/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Rate estimator
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Simulated sandbox rates
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4">
              <div>
                <label htmlFor="calc-country" className="text-xs text-slate-400 block mb-1.5 font-medium">
                  From
                </label>
                <select
                  id="calc-country"
                  value={calcCountry}
                  onChange={(e) => setCalcCountry(e.target.value as "NG" | "GH" | "KE" | "ZA")}
                  className="w-full bg-[#080B14] border border-violet-900/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-medium"
                >
                  <option value="NG">🇳🇬 Nigeria (NGN)</option>
                  <option value="GH">🇬🇭 Ghana (GHS)</option>
                  <option value="KE">🇰🇪 Kenya (KES) — coming soon</option>
                  <option value="ZA">🇿🇦 South Africa (ZAR) — coming soon</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">To</span>
                <div className="w-full bg-[#080B14]/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 font-medium">
                  🇧🇴 Bolivia (BOB)
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="calc-amount" className="text-xs text-slate-400 font-medium">
                  You send ({selectedRate.currency})
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  1 USDC = {selectedRate.rate} {selectedRate.currency}
                </span>
              </div>
              <input
                id="calc-amount"
                type="number"
                min={1}
                value={calcSourceAmount}
                onChange={(e) => setCalcSourceAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#080B14] border border-violet-900/40 rounded-xl px-4 py-2.5 text-lg font-mono text-white focus:outline-none focus:border-violet-500 font-semibold"
              />
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-violet-300 font-mono">They receive</div>
                <div className="text-xl font-bold font-mono text-emerald-400">{estUsdc} USDC</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-mono">≈ BOB payout</div>
                <div className="text-base font-bold font-mono text-white">~{estBob} BOB</div>
              </div>
            </div>

            <Link
              href={`/send?country=${calcCountry}&amount=${calcSourceAmount}`}
              className="block w-full mt-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs text-center transition-colors shadow-md"
            >
              Continue to send →
            </Link>
          </div>

          {/* Proof strip — single line, no cards */}
          <dl className="relative mt-6 max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 rounded-xl border-y border-slate-800/80 text-center">
            {[
              ["4", "active corridors"],
              ["4", "rails online"],
              ["5–25 min", "typical settlement"],
              ["Stellar", "testnet settlement"],
            ].map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-1.5">
                <dt className="sr-only">{l}</dt>
                <dd className="text-sm font-bold font-mono text-white">{v}</dd>
                <dd className="text-[11px] text-slate-500">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section id="how-it-works" className="scroll-mt-24 space-y-7 animate-fade-up">
          <SectionHeading
            align="center"
            eyebrow="The flow"
            title="How it works"
            description="Four steps from your phone to their wallet. The same flow for every country and every rail."
          />
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative p-5 rounded-2xl bg-[#0F162E] border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <s.icon className="w-5 h-5 text-violet-300" />
                  <span className="text-[11px] font-mono text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- CORRIDORS ---------- */}
        <section className="space-y-7 animate-fade-up">
          <SectionHeading
            eyebrow="Where you can send"
            title="Four corridors, one flow"
            description="Live sandbox routes from Africa to Bolivia. Pick one to start a transfer."
            actionHref="/operator/corridors"
            actionLabel="Corridor admin"
          />
          <div className="flex items-center gap-2">
            <BobQuoteBadge />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CORRIDORS.map((c) => (
              <div
                key={c.from}
                className="p-5 rounded-2xl bg-[#0D1326] border border-violet-900/30 hover:border-violet-500/40 transition-all space-y-4 flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      {c.flag}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm text-white">{c.from} → Bolivia</h3>
                      <span className="text-[11px] font-mono text-slate-400">{c.pair}</span>
                    </div>
                  </div>
                  <StatusBadge status={c.active ? "Active" : "Coming soon"} />
                </div>
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Rate</span>
                    <span className="font-mono text-white">{c.rate}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Rails</span>
                    <span className="text-slate-300 text-right">{c.rails}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Speed</span>
                    <span className={`font-mono ${c.active ? "text-emerald-400" : "text-slate-400"}`}>
                      {c.speed}
                    </span>
                  </div>
                </div>
                <Link
                  href={c.href}
                  className="block text-center py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-violet-300 text-xs font-medium transition-colors"
                >
                  {c.active ? `Send from ${c.from} →` : "View corridor →"}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- SAFETY ---------- */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#0F162E] border border-violet-900/40 space-y-6 animate-fade-up">
          <SectionHeading
            tone="emerald"
            eyebrow="Why it's safe"
            title="Money only moves when both sides check out"
            description="Your local payment and the USDC settlement are locked together. One can't move without the other."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Lock,
                title: "No release without proof",
                text: "USDC stays locked until your local payment is verified — by an operator or a bank webhook.",
              },
              {
                icon: ShieldCheck,
                title: "Everything is logged",
                text: "Quotes, payments, verifications, and settlements share one audit trail you can inspect.",
              },
              {
                icon: RefreshCw,
                title: "Always reconcilable",
                text: "Expected vs. received vs. settled amounts are checked continuously, per transfer.",
              },
            ].map((f) => (
              <div key={f.title} className="p-4 rounded-xl bg-[#090D1C] border border-slate-800 space-y-2">
                <f.icon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- RAILS ---------- */}
        <section className="space-y-6 animate-fade-up">
          <SectionHeading
            align="center"
            eyebrow="Local payment options"
            title="Pay the way you already pay"
            description="Bank, mobile money, or agents — the steps after payment are identical."
          />
          <div className="max-w-3xl mx-auto p-5 rounded-2xl bg-[#0D1326] border border-violet-900/30 space-y-3">
            {[
              { icon: Building2, name: "Bank transfer", detail: "Nigeria NIP · Ghana GHIPSS · South Africa EFT" },
              { icon: Smartphone, name: "Mobile money", detail: "M-Pesa · MTN Momo · Telecel Cash" },
              { icon: Users, name: "P2P & agents", detail: "Verified desks with proof-of-payment receipts" },
            ].map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <r.icon className="w-5 h-5 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{r.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">{r.detail}</p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Online
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="space-y-6 animate-fade-up">
          <SectionHeading
            align="center"
            eyebrow="Questions, answered"
            title="How the demo works"
            description="The escrow rule, the Pollar leg, and what is simulated — in plain language."
          />
          <div className="max-w-3xl mx-auto">
            <Faq
              items={[
                {
                  q: "Where does my money go in the demo?",
                  a: "To a sandbox escrow rail — a test bank account, mobile-money prompt, or agent desk. Nothing moves on-chain until an operator verifies your deposit. Only then is testnet USDC settled through Pollar.",
                },
                {
                  q: "Why isn't the USDC released immediately?",
                  a: "Because detection isn't verification. Your payment has to be confirmed first, otherwise funds could be released against a payment that never arrived. The app refuses to settle until verification happens.",
                },
                {
                  q: "What is real and what is simulated?",
                  a: "Real: routes, quotes, verification, audit trail, and testnet USDC wallets. Simulated: the final BOB payout, which belongs to Pollar's live ramp and is outside this demo.",
                },
                {
                  q: "Do I need an account to track a transfer?",
                  a: "No. Every transfer gets a public tracking link showing status, amounts, and transaction hashes. Banking details are never exposed.",
                },
                {
                  q: "What if my payment can't be matched?",
                  a: "An operator rejects or refunds it from the queue. Every outcome — including failures — stays in the transfer history, so nothing disappears silently.",
                },
              ]}
            />
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="text-center py-10 px-6 rounded-3xl bg-gradient-to-b from-[#131B38] to-[#0A0E1F] border border-violet-900/40 space-y-5 relative overflow-hidden animate-fade-up">
          <p className="text-[11px] font-mono text-slate-500">
            Stellar testnet · corridor availability is read from the backend ·{" "}
            <Link href="/track" className="text-violet-300 hover:text-violet-200">
              Open demo tracker
            </Link>
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Try a transfer end to end
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Send a sandbox payment, verify it as the operator, and watch the settlement land — no real money involved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/send"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-xl shadow-violet-900/50 transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>Start a transfer</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/operator"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-medium text-sm transition-all"
            >
              <span>Open operator view</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

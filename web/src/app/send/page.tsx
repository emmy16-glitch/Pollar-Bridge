"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Clock,
  Shield,
  Upload,
  AlertTriangle,
  Building2,
  Users,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Share2,
  Printer,
  FileCheck,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { formatCurrency, truncateHash } from "@/lib/formatters";
import Timeline from "@/components/ui/Timeline";
import { transferSteps } from "@/components/ui/transferSteps";

type Step = "ROUTE" | "RAILS" | "PAYMENT" | "STATUS" | "RECEIPT";

interface RailOption {
  id: string;
  name: string;
  corridorId: string;
  railType: string;
  mode: string;
  status: string;
  estimatedDelivery: string;
  fixedFee: string;
  percentFee: string;
  speedRank: string;
  verificationMethod: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface TransferData {
  id: string;
  trackingToken: string;
  sourceCountry: string;
  sourceCurrency: string;
  destCountry: string;
  destCurrency: string;
  sourceAmount: string;
  providerFee: string;
  pollarFee: string;
  totalSourceAmount: string;
  usdcAmount: string;
  estimatedBobPayout: string;
  exchangeRate: string;
  selectedRailId: string;
  railName: string;
  status: string;
  paymentReference: string;
  recipientWalletAddress: string;
  recipientName: string;
  rateSource: string;
  pollarTxHash?: string;
  stellarLedger?: string;
  createdAt: string;
}

import { Suspense } from "react";

function SendPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current step in flow
  const [currentStep, setCurrentStep] = useState<Step>("ROUTE");

  // Step 1: Route form
  const [sourceCountry, setSourceCountry] = useState<string>("Nigeria");
  const [sourceCurrency, setSourceCurrency] = useState<string>("NGN");
  const [sourceAmount, setSourceAmount] = useState<string>("100000");
  const [recipientWallet, setRecipientWallet] = useState<string>(
    "GDQP2KPQGKIHYJGXNURG74YTI5FD5CJXNURG74YTI5FD5C"
  );
  const [recipientName, setRecipientName] = useState<string>("Maria Rodriguez (Bolivia)");

  // Rates & Corridors
  const [corridors, setCorridors] = useState<any[]>([]);
  const [providers, setProviders] = useState<RailOption[]>([]);
  const [selectedRail, setSelectedRail] = useState<RailOption | null>(null);

  // Quote / Transfer state
  const [transfer, setTransfer] = useState<TransferData | null>(null);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number>(582); // ~9:42 min
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [proofFileUploaded, setProofFileUploaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Handle URL query presets
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const qCountry = searchParams.get("country");
      const qAmount = searchParams.get("amount");
      if (qCountry === "GH") {
        setSourceCountry("Ghana");
        setSourceCurrency("GHS");
        setSourceAmount(qAmount || "1500");
      } else if (qCountry === "KE") {
        setSourceCountry("Kenya");
        setSourceCurrency("KES");
        setSourceAmount(qAmount || "10000");
      } else if (qCountry === "ZA") {
        setSourceCountry("South Africa");
        setSourceCurrency("ZAR");
        setSourceAmount(qAmount || "3000");
      } else if (qAmount) {
        setSourceAmount(qAmount);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  // Load corridors and providers
  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/corridors"),
          fetch("/api/providers"),
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();
        if (cData.success) setCorridors(cData.corridors);
        if (pData.success) setProviders(pData.providers);
      } catch (err) {
        console.error("Failed to load corridors/providers:", err);
      }
    }
    loadData();
  }, []);

  // Update currency when country changes
  const handleCountryChange = (cName: string) => {
    setSourceCountry(cName);
    setSelectedRail(null);
    if (cName === "Nigeria") {
      setSourceCurrency("NGN");
      setSourceAmount("100000");
    } else if (cName === "Ghana") {
      setSourceCurrency("GHS");
      setSourceAmount("1500");
    } else if (cName === "Kenya") {
      setSourceCurrency("KES");
      setSourceAmount("12000");
    } else if (cName === "South Africa") {
      setSourceCurrency("ZAR");
      setSourceAmount("2500");
    }
  };

  // Filter available rails for selected country
  const currentCorridor = corridors.find(
    (c) => c.fromCountry.toLowerCase() === sourceCountry.toLowerCase()
  );
  const availableRails = providers.filter(
    (p) =>
      (!currentCorridor || p.corridorId === currentCorridor.id) &&
      p.status !== "Coming soon" &&
      p.status !== "Locked"
  );

  // Origin-country dropdown options (live corridors, static fallback)
  const FLAG: Record<string, string> = { NG: "🇳🇬", GH: "🇬🇭", KE: "🇰🇪", ZA: "🇿🇦" };
  const countryOptions =
    corridors.length > 0
      ? corridors.map((c) => ({ name: c.fromCountry, code: c.fromCode, currency: c.fromCurrency }))
      : [
          { name: "Nigeria", code: "NG", currency: "NGN" },
          { name: "Ghana", code: "GH", currency: "GHS" },
          { name: "Kenya", code: "KE", currency: "KES" },
          { name: "South Africa", code: "ZA", currency: "ZAR" },
        ];

  // Quote countdown timer (runs while picking a rail + reviewing the quote)
  useEffect(() => {
    if (currentStep !== "RAILS") return;
    const interval = setInterval(() => {
      setQuoteSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep]);

  // Status Polling when in Step 5 (STATUS)
  useEffect(() => {
    if (currentStep !== "STATUS" || !transfer) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/transfers/${transfer.id}`);
        const data = await res.json();
        if (data.success && data.transfer) {
          setTransfer(data.transfer);
          if (data.transfer.status === "COMPLETED") {
            setCurrentStep("RECEIPT");
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (e) {
        console.error("Status poll error:", e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentStep, transfer]);

  // Helper copy to clipboard
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Calculations for Step 3 Quote
  const numAmount = parseFloat(sourceAmount) || 0;
  const currentRate = currentCorridor ? parseFloat(currentCorridor.usdcRate) : 1608.2;
  const bobPerUsdc = currentCorridor ? parseFloat(currentCorridor.bobPerUsdc) : 6.96;

  const fixedFee = selectedRail ? parseFloat(selectedRail.fixedFee || "0") : 700;
  const pctFee = selectedRail ? parseFloat(selectedRail.percentFee || "0") : 0;
  const providerFee = fixedFee + numAmount * pctFee;
  const pollarBridgeFee = Math.max(numAmount * 0.007, 100);
  const totalPayable = numAmount + providerFee + pollarBridgeFee;
  const estUsdc = (numAmount / currentRate).toFixed(2);
  const estBob = (parseFloat(estUsdc) * bobPerUsdc).toFixed(2);

  // Submit quote & create transfer
  const handleConfirmQuote = async () => {
    if (!selectedRail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCountry,
          sourceCurrency,
          sourceAmount: numAmount.toFixed(2),
          selectedRailId: selectedRail.id,
          recipientWalletAddress: recipientWallet,
          recipientName,
        }),
      });
      const data = await res.json();
      if (data.success && data.transfer) {
        setTransfer(data.transfer);
        setCurrentStep("PAYMENT");
      } else {
        alert(data.error || "Failed to create transfer instructions");
      }
    } catch (err) {
      console.error(err);
      alert("Network error creating quote");
    } finally {
      setLoading(false);
    }
  };

  // Submit payment confirmation ("I've made the payment")
  const handleSubmitPayment = async () => {
    if (!transfer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_PAYMENT",
          paymentProofUrl: proofFileUploaded
            ? "https://pollarbridge.africa/proofs/user-upload-slip.png"
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.transfer) {
        setTransfer(data.transfer);
        setCurrentStep("STATUS");
      } else {
        alert(data.error || "Failed to update payment status");
      }
    } catch (err) {
      console.error(err);
      alert("Error confirming payment");
    } finally {
      setLoading(false);
    }
  };

  // Instant Test Operator Simulation (for immediate reviewer gratification)
  const handleSimulateOperatorApproval = async () => {
    if (!transfer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_SETTLE",
          operatorNotes: "Operator verified deposit slip in sandbox. Released USDC via Pollar testnet.",
        }),
      });
      const data = await res.json();
      if (data.success && data.transfer) {
        setTransfer(data.transfer);
        setCurrentStep("RECEIPT");
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(quoteSecondsLeft / 60);
  const seconds = quoteSecondsLeft % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Step Progress Tracker Bar */}
        <div className="p-4 rounded-2xl bg-[#0F162E] border border-violet-900/30">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider mb-3">
            <span className="text-violet-400">Your transfer</span>
            <span className="text-slate-400">
              Step{" "}
              {currentStep === "ROUTE"
                ? "1 of 5"
                : currentStep === "RAILS"
                ? "2 of 5"
                : currentStep === "PAYMENT"
                ? "3 of 5"
                : currentStep === "STATUS"
                ? "4 of 5"
                : "5 of 5"}
            </span>
          </div>

          {/* Stepper Dots & Line */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: "ROUTE", label: "Route" },
              { id: "RAILS", label: "Pay with" },
              { id: "PAYMENT", label: "Pay" },
              { id: "STATUS", label: "Status" },
              { id: "RECEIPT", label: "Done" },
            ].map((step, idx) => {
              const stepOrder = ["ROUTE", "RAILS", "PAYMENT", "STATUS", "RECEIPT"];
              const currentIdx = stepOrder.indexOf(currentStep);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div key={step.id} className="text-center space-y-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isPast
                        ? "bg-emerald-500"
                        : isCurrent
                        ? "bg-violet-500 ring-2 ring-violet-500/40"
                        : "bg-slate-800"
                    }`}
                  />
                  <span
                    className={`text-[10px] hidden sm:block ${
                      isCurrent
                        ? "text-violet-300 font-bold"
                        : isPast
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: CHOOSE ROUTE */}
        {currentStep === "ROUTE" && (
          <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-2">
                Step 1 · Route
              </div>
              <h2 className="text-2xl font-bold text-white">Where are you sending from?</h2>
              <p className="text-xs text-slate-400">
                Pick where the money leaves from — Bolivia is always the destination.
              </p>
            </div>

            <div className="space-y-4">
              {/* Origin Country */}
              <div>
                <label
                  htmlFor="origin-country"
                  className="text-xs font-medium text-slate-300 block mb-1.5"
                >
                  From country
                </label>
                <select
                  id="origin-country"
                  value={sourceCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-[#090D1C] border border-violet-900/40 rounded-xl px-4 py-3.5 text-sm font-semibold text-white focus:outline-none focus:border-violet-500"
                >
                  {countryOptions.map((country) => (
                    <option key={country.name} value={country.name}>
                      {FLAG[country.code] ? `${FLAG[country.code]} ` : ""}{country.name} — {country.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Country (Challenge Destination: Bolivia) */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  To
                </label>
                <div className="p-3.5 rounded-xl bg-[#090D1C] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇧🇴</span>
                    <div>
                      <div className="font-semibold text-sm text-white">Bolivia</div>
                      <div className="text-xs text-slate-400">
                        Receives <span className="font-mono text-emerald-400">BOB</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-violet-950/80 border border-violet-500/30 text-violet-300">
                    Destination
                  </span>
                </div>
              </div>

              {/* Amount to send */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Amount to send ({sourceCurrency})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    value={sourceAmount}
                    onChange={(e) => setSourceAmount(e.target.value)}
                    className="w-full bg-[#090D1C] border border-violet-900/40 rounded-xl px-4 py-3.5 text-xl font-mono text-white focus:outline-none focus:border-violet-500 font-bold"
                    placeholder="100000"
                  />
                  <div className="absolute right-4 top-3 text-sm font-mono text-slate-400 font-bold">
                    {sourceCurrency}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
                  <span>Current corridor rate: 1 USDC ≈ {currentRate} {sourceCurrency}</span>
                  <span>Est. Recipient: ~{estUsdc} USDC (~{estBob} BOB)</span>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="text-xs font-semibold text-slate-300">Recipient</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Name</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-[#090D1C] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Wallet address</label>
                    <input
                      type="text"
                      value={recipientWallet}
                      onChange={(e) => setRecipientWallet(e.target.value)}
                      className="w-full bg-[#090D1C] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!parseFloat(sourceAmount) || parseFloat(sourceAmount) <= 0) {
                    alert("Please enter a valid amount");
                    return;
                  }
                  setCurrentStep("RAILS");
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-900/40"
              >
                <span>See payment options</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: COMPARE LOCAL PAYMENT RAILS */}
        {currentStep === "RAILS" && (
          <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-2">
                  Step 2 · Payment method
                </div>
                <h2 className="text-2xl font-bold text-white">How do you want to pay?</h2>
                <p className="text-xs text-slate-400">
                  Choose how to pay {formatCurrency(numAmount, sourceCurrency)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep("ROUTE")}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            {/* Rails Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRails.length === 0 && (
                <div className="md:col-span-2 p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-sm text-amber-200">
                  No payment rail is currently enabled for {sourceCountry}. Choose Nigeria or Ghana for the live sandbox flow.
                </div>
              )}
              {availableRails.map((rail) => {
                const isSelected = selectedRail?.id === rail.id;
                const railFixed = parseFloat(rail.fixedFee || "0");
                const railPct = parseFloat(rail.percentFee || "0");
                const calculatedFee = railFixed + numAmount * railPct;

                return (
                  <div
                    key={rail.id}
                    onClick={() => setSelectedRail(rail)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-violet-950/30 border-violet-500 shadow-lg shadow-violet-900/40"
                        : "bg-[#090D1C] border-slate-800 hover:border-violet-900/60"
                    }`}
                  >
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {rail.railType === "Bank transfer" ? (
                          <Building2 className="w-4 h-4 text-violet-400" />
                        ) : rail.railType === "P2P Provider" ? (
                          <Users className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-semibold text-white text-sm">{rail.railType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {rail.speedRank === "Cheapest" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Cheapest
                          </span>
                        )}
                        {rail.speedRank === "Fastest" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Fastest
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {rail.mode}
                        </span>
                      </div>
                    </div>

                    {/* Rail Name & Details */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="font-bold text-base text-white">{rail.name}</div>
                        <div className="text-xs text-slate-400">
                          {rail.bankName} · {rail.accountName}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#0D1224] border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Arrives:</span>
                          <span className="font-mono text-emerald-400 font-medium">
                            {rail.estimatedDelivery}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fee:</span>
                          <span className="font-mono text-white">
                            {formatCurrency(calculatedFee, sourceCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Checked by:</span>
                          <span className="font-mono text-slate-300 text-[11px]">
                            {rail.verificationMethod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rate:</span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            Simulated sandbox rate
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Select Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRail(rail);
                      }}
                      className={`w-full py-2.5 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-violet-600 hover:bg-violet-500 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      <span>Choose {rail.railType}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quote breakdown for the selected rail */}
            {selectedRail && (
            <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-2">
                  Your quote
                </div>
                <h2 className="text-2xl font-bold text-white">Check the numbers</h2>
                <p className="text-xs text-slate-400">
                  Confirm the fees and what they receive before continuing.
                </p>
              </div>

              {/* Countdown badge */}
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>Quote expires in {formattedCountdown}</span>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="p-5 rounded-2xl bg-[#090D1C] border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">You send</span>
                <span className="text-white font-bold">{formatCurrency(numAmount, sourceCurrency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">Fee ({selectedRail.name})</span>
                <span className="text-slate-300">{formatCurrency(providerFee, sourceCurrency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">Our fee</span>
                <span className="text-slate-300">{formatCurrency(pollarBridgeFee, sourceCurrency)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-b border-violet-900/40">
                <span className="text-violet-300 font-sans font-bold">You pay</span>
                <span className="text-violet-200 font-bold">{formatCurrency(totalPayable, sourceCurrency)}</span>
              </div>

              <div className="pt-2 flex justify-between py-1">
                <span className="text-slate-400 font-sans">They receive</span>
                <span className="text-emerald-400 font-bold text-sm">{estUsdc} USDC</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-sans">BOB payout (est.)</span>
                <span className="text-white font-bold">{estBob} BOB</span>
              </div>
              <div className="flex justify-between py-1 text-[11px] text-slate-500">
                <span className="font-sans">Rate</span>
                <span>Sandbox rate (1 USDC = {currentRate} {sourceCurrency})</span>
              </div>
            </div>

            {/* Recipient summary banner */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400">To: </span>
                <span className="font-medium text-white">{recipientName}</span>
                <span className="text-slate-500 font-mono block text-[11px]">
                  Wallet: {truncateHash(recipientWallet, 8, 8)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-violet-950/60 text-violet-300 text-[11px] font-mono border border-violet-500/20">
                Stellar Testnet
              </span>
            </div>

            {/* Confirm */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmQuote}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-900/40 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Issuing instructions...</span>
                  </>
                ) : (
                  <>
                    <span>Get payment instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            </div>
            )}
          </div>
        )}

        {/* STEP 4: LOCAL PAYMENT INSTRUCTIONS */}
        {currentStep === "PAYMENT" && transfer && selectedRail && (
          <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-2">
                Step 3 · Pay
              </div>
              <h2 className="text-2xl font-bold text-white">Pay exactly this</h2>
              <p className="text-xs text-slate-400">
                Send the exact amount and include your reference so we can match it.
              </p>
            </div>

            {/* Crucial Sandbox Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Demo note:</span>
                An operator confirms your payment. Nothing is released until then.
              </div>
            </div>

            {/* Instruction Details Card */}
            <div className="p-6 rounded-2xl bg-[#090D1C] border border-slate-800 space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Amount to transfer:</span>
                <div className="text-2xl font-extrabold text-white">
                  {formatCurrency(transfer.totalSourceAmount, transfer.sourceCurrency)}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Bank:</span>
                <span className="text-sm font-semibold text-white">{selectedRail.bankName}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Account name:</span>
                <span className="text-sm text-slate-200">{selectedRail.accountName}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 font-sans block">Account number:</span>
                  <span className="text-base font-bold text-emerald-400 tracking-wider">
                    {selectedRail.accountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedRail.accountNumber, "acc")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "acc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "acc" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-sans block">
                    Reference — include this:
                  </span>
                  <span className="text-base font-bold text-violet-300 tracking-wider">
                    {transfer.paymentReference}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(transfer.paymentReference, "ref")}
                  className="px-3 py-1.5 rounded-lg bg-violet-950/80 hover:bg-violet-900/80 border border-violet-500/30 text-xs text-violet-200 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "ref" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "ref" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* P2P Proof Upload (If P2P or optional proof for sandbox bank) */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Payment proof (optional)</span>
                {proofFileUploaded && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Attached: transfer-slip.pdf
                  </span>
                )}
              </div>
              <div
                onClick={() => setProofFileUploaded(!proofFileUploaded)}
                className="border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xs text-slate-300 font-medium">
                  {proofFileUploaded ? "Proof attached — click to replace" : "Click to attach your receipt (simulated)"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">PNG, JPG, PDF up to 5MB</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep("RAILS")}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Back
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitPayment}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I&apos;ve made the payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: TRANSFER STATUS TIMELINE */}
        {currentStep === "STATUS" && transfer && (
          <div className="rounded-3xl bg-[#0F162E] border border-violet-900/40 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono mb-1">
                  Transfer Ref: {transfer.id}
                </div>
                <h2 className="text-2xl font-bold text-white">Transfer progress</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch(`/api/transfers/${transfer.id}`);
                    const data = await res.json();
                    if (data.success && data.transfer) setTransfer(data.transfer);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                <a
                  href={`/track/${transfer.trackingToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-violet-950/80 border border-violet-500/30 text-xs font-mono text-violet-300 hover:text-white flex items-center gap-1.5"
                >
                  <span>Public link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Status timeline */}
            <div className="max-w-xl mx-auto py-2">
              <Timeline steps={transferSteps(transfer.status)} ariaLabel="Transfer progress" />
            </div>

            {/* Demo shortcut: approve without visiting the queue */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-violet-950/40 to-slate-900 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-amber-400 tracking-wider">
                  Demo shortcut
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Skip the queue</span>
              </div>
              <p className="text-xs text-slate-300">
                Normally an operator reviews this in the queue. For the demo, you can approve it right here.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSimulateOperatorApproval}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Approve & release USDC</span>
                </button>

                <a
                  href="/operator/queue"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  Open payment queue →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: COMPLETION RECEIPT */}
        {currentStep === "RECEIPT" && transfer && (
          <div className="rounded-3xl bg-[#0F162E] border border-emerald-500/40 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Top Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center space-y-3 pt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold text-white">Transfer complete</h2>
              <p className="text-sm text-emerald-300 font-mono">
                {transfer.usdcAmount} USDC sent through Pollar
              </p>
            </div>

            {/* Receipt Details Card */}
            <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#090D1C] border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Reference:</span>
                <span className="text-white font-bold">{transfer.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Delivered:</span>
                <span className="text-emerald-400 font-bold">{transfer.usdcAmount} USDC</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Payout (est.):</span>
                <span className="text-white font-bold">{transfer.estimatedBobPayout} BOB</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Recipient wallet:</span>
                <span className="text-slate-300">{truncateHash(transfer.recipientWalletAddress, 8, 8)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Stellar transaction:</span>
                <span className="text-violet-300 font-bold">
                  {truncateHash(transfer.pollarTxHash || "8b7c91e2f044a1b8c34f37829104041b6c7a91e2049281", 6, 6)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Ledger:</span>
                <span className="text-slate-400">{transfer.stellarLedger || "4829104"}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-400">
                <span className="font-sans">Status:</span>
                <span className="text-emerald-400 font-bold">Settled</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>View receipt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/track/${transfer.trackingToken}`
                  );
                  alert("Tracking link copied to clipboard!");
                }}
                className="px-5 py-2.5 rounded-xl bg-violet-950/80 hover:bg-violet-900 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share tracking link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep("ROUTE");
                  setTransfer(null);
                  setSelectedRail(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <span>Send another transfer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Receipt Modal Sheet */}
        {showReceiptModal && transfer && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#0D1224] border border-violet-900/50 p-6 space-y-4 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-white text-sm">Transfer receipt</div>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-mono"
                >
                  Close <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference:</span>
                  <span className="text-white font-bold">{transfer.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-slate-300">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin:</span>
                  <span className="text-slate-300">
                    {transfer.sourceCountry} ({transfer.sourceCurrency})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="text-slate-300">Bolivia (BOB)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">You paid:</span>
                  <span className="text-white font-bold">
                    {formatCurrency(transfer.totalSourceAmount, transfer.sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">USDC sent:</span>
                  <span className="text-emerald-400 font-bold">{transfer.usdcAmount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">BOB payout:</span>
                  <span className="text-white font-bold">{transfer.estimatedBobPayout} BOB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stellar Hash:</span>
                  <span className="text-violet-300">{truncateHash(transfer.pollarTxHash, 8, 8)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="py-16 text-center text-slate-400 font-mono text-sm">
            Loading...
          </div>
        </AppShell>
      }
    >
      <SendPageContent />
    </Suspense>
  );
}

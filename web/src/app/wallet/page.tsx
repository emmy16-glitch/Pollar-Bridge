"use client";

import React, { useCallback, useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import {
  Wallet,
  Send,
  Download,
  Copy,
  Check,
  ExternalLink,
  Coins,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from "lucide-react";
import { truncateHash, formatDate } from "@/lib/formatters";
import PollarWalletCard from "@/components/PollarWalletCard";

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("GBV47J2D3Z2P7QXZ5N9VTR3B4C5D6E7F8G9H0J1K2L3M");
  const [sendAmount, setSendAmount] = useState("50.00");
  const [sendMemo, setSendMemo] = useState("PollarBridge settlement demo");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchWallet(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchWallet]);

  const handleCopyAddress = () => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFaucet = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FAUCET" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchWallet();
        alert("Faucet credited +250.00 USDC to Stellar Testnet wallet!");
      }
    } catch {
      alert("Faucet failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND",
          recipientAddress: sendRecipient,
          amount: sendAmount,
          memo: sendMemo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSendModal(false);
        await fetchWallet();
        alert(`Dispatched ${sendAmount} USDC on Stellar Testnet! Tx: ${data.txHash.slice(0, 16)}...`);
      } else {
        alert(data.error || "Send failed");
      }
    } catch {
      alert("Send failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header & Network Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              STELLAR TESTNET
            </div>
            <h1 className="text-3xl font-extrabold text-white">Pollar Wallet</h1>
            <p className="text-xs text-slate-400">
              Primary Stellar testnet wallet integration for Pollar settlement and cross-border disbursements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFaucet}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-violet-950/80 hover:bg-violet-900 border border-violet-500/40 text-violet-200 text-xs font-mono flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>+250 USDC Testnet Faucet</span>
            </button>

            <button
              onClick={fetchWallet}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Refresh wallet"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Wallet Balance Card */}
        <div className="rounded-3xl bg-gradient-to-tr from-[#0F162E] via-[#121B3A] to-[#18244E] border border-violet-500/30 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                USDC balance
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-white mt-1">
                {wallet ? wallet.usdcBalance : "1,850.45"}{" "}
                <span className="text-emerald-400 text-2xl sm:text-3xl">USDC</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-3">
                <span>Network: <strong className="text-violet-300">Stellar Testnet</strong></span>
                <span>·</span>
                <span>Reserve: <strong className="text-slate-300">{wallet?.xlmBalance || "48.20"} XLM</strong></span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSendModal(true)}
                className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-violet-900/50"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Send USDC</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReceiveModal(true)}
                className="px-5 py-3 rounded-xl bg-[#090D1C] hover:bg-[#101730] border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Receive</span>
              </button>
            </div>
          </div>

          {/* Wallet Address Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Wallet address:</span>
              <span className="text-violet-200 font-bold break-all">
                {wallet?.address || "GDQP2KPQGKIHYJGXNURG74YTI5FD5CJXNURG74YTI5FD5C"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyAddress}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-colors font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy address"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pollar SDK wallet (real) */}
        <PollarWalletCard />

        {/* Transaction History */}
        <div className="rounded-3xl bg-[#0F162E] border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Transaction history</h2>
              <p className="text-xs text-slate-400">
                Pollar settlement bridge events and testnet transfers
              </p>
            </div>
            <span className="text-xs font-mono text-violet-400">
              {history.length} Transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Transfer / Tx</th>
                  <th className="pb-3 font-semibold">Corridor</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3">
                      <div className="font-bold text-white">{tx.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {truncateHash(tx.pollarTxHash || tx.paymentReference, 8, 8)}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-slate-300">
                        {tx.sourceCountry} → {tx.destCountry}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {tx.railName}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-emerald-400">
                        +{tx.usdcAmount} USDC
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ~{tx.estimatedBobPayout} BOB
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          tx.status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{formatDate(tx.createdAt)}</td>
                    <td className="py-3 text-right text-slate-400">
                      {tx.stellarLedger || "4829104"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Send Modal */}
        {showSendModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#0F162E] border border-violet-900/60 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-white text-base">Send USDC (Stellar Testnet)</div>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Recipient Address (G...)</label>
                  <input
                    type="text"
                    required
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Memo (Optional)</label>
                  <input
                    type="text"
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                    className="w-full bg-[#080B14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20 text-xs text-slate-300">
                  Network fee: <span className="font-mono text-emerald-400 font-bold">0.00001 XLM</span> · Instant Stellar settlement
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSendModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading ? "Sending..." : "Confirm & Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receive Modal */}
        {showReceiveModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#0F162E] border border-violet-900/60 p-6 space-y-4 text-center shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-left">
                <div className="font-bold text-white text-base">Receive USDC</div>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-mono">Your Stellar Testnet address:</span>
                <div className="p-2.5 rounded-xl bg-[#080B14] border border-slate-800 text-xs font-mono text-violet-200 break-all">
                  {wallet?.address}
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Address Copied!" : "Copy Address"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

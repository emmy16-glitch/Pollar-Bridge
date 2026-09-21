import { v4 as uuid } from "uuid";
import type { Transfer, TransferStatus } from "../../types.js";
import { assertFinitePositive, assertNonBlank, normalizeOptionalText } from "../../validation.js";
import { getCorridor } from "../corridors/corridorRegistry.js";
import type { ProviderRegistry } from "../providers/providerRegistry.js";
import { MemoryStore } from "../../store/memoryStore.js";
import { emitTransfer } from "../../store/transferEvents.js";
import { QuoteService } from "./quoteService.js";
import { assertTransition } from "./stateMachine.js";
import { buildHandoffReceipt, ensureWallet, fundDeferredWallet, settleUsdc, submitPollarTransfer } from "../pollar/pollarService.js";

function now(): string {
  return new Date().toISOString();
}

function stamp(t: Transfer, status: TransferStatus, note?: string): void {
  assertTransition(t.status, status);
  t.status = status;
  t.history.push({ status, at: now(), note });
  t.updatedAt = now();
  emitTransfer(t);
}

export class TransferService {
  constructor(
    private registry: ProviderRegistry,
    private store: MemoryStore,
    private quotes: QuoteService,
  ) {}

  createTransfer(corridorId: string, sourceAmount: number, senderName?: string, idempotencyKey?: string): Transfer {
    // No empty transactions: blank corridor/amount rejected, blank sender/key
    // normalized to absent (defaults apply) instead of stored as "".
    corridorId = assertNonBlank(corridorId, "corridorId");
    sourceAmount = assertFinitePositive(sourceAmount, "sourceAmount");
    const hasSenderName = Boolean(normalizeOptionalText(senderName));
    idempotencyKey = normalizeOptionalText(idempotencyKey);
    // Safe retries: same key returns the original transfer, never a duplicate.
    if (idempotencyKey) {
      const existing = this.store.getByIdempotency(idempotencyKey);
      if (existing) return existing;
    }
    const corridor = getCorridor(corridorId);
    if (!corridor.enabled) throw new Error(`Corridor disabled: ${corridorId}`);
    const quote = this.quotes.createQuote({ corridorId, sourceAmount });
    this.store.saveQuote(quote);
    const reference = `PB-${uuid().slice(0, 8).toUpperCase()}`;
    const t: Transfer = {
      transferId: `tr_${uuid().slice(0, 8)}`,
      corridorId: corridor.id,
      quoteId: quote.quoteId,
      paymentId: "",
      reference,
      shareToken: uuid().replace(/-/g, "").slice(0, 12),
      idempotencyKey,
      sourceAmount,
      totalRequired: quote.totalRequired,
      amountDue: quote.amountDue,
      totalFees: quote.totalFees,
      settlementAmount: quote.settlementAmount,
      status: "QUOTE_CREATED",
      // Never put sender PII in timeline/audit-like fields: transfer history
      // is surfaced by operational and demo APIs.
      history: [{ status: "QUOTE_CREATED", at: now(), note: `sender=${hasSenderName ? "provided" : "anonymous"} corridor=${corridor.id}` }],
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.saveTransfer(t);
    emitTransfer(t);
    return t;
  }

  async issuePaymentInstructions(transferId: string): Promise<Transfer> {
    const t = this.store.getTransfer(transferId);
    // Idempotent: re-issuing returns the same instructions.
    if (t.paymentId && t.instructions) return t;
    const quote = this.store.getQuote(t.quoteId);
    const corridor = getCorridor(t.corridorId);
    const adapter = this.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
    const instruction = await adapter.createPayment({
      quoteId: quote.quoteId,
      reference: t.reference,
      localAmount: t.totalRequired,
    });
    t.paymentId = instruction.paymentId;
    t.instructions = instruction.instructions;
    t.paymentExpiresAt = instruction.expiresAt;
    // re-index payment -> transfer (drops the stale "" index)
    this.store.saveTransfer(t);
    stamp(t, "PAYMENT_INSTRUCTIONS_ISSUED", `provider=${adapter.providerId}`);
    stamp(t, "AWAITING_LOCAL_PAYMENT");
    this.store.saveTransfer(t);
    return t;
  }

  /** Expire stale transfers. Returns true if it just expired. */
  private expireIfStale(t: Transfer): boolean {
    if (["COMPLETED", "PAYMENT_EXPIRED", "PAYMENT_REJECTED", "REFUNDED"].includes(t.status)) return false;
    try {
      const quote = this.store.getQuote(t.quoteId);
      const quoteExpired = Date.now() > new Date(quote.expiry).getTime();
      const payExpired = t.paymentExpiresAt ? Date.now() > new Date(t.paymentExpiresAt).getTime() : false;
      // Quote expiry only blocks pre-verification steps; payment expiry blocks all.
      if (payExpired || (quoteExpired && ["QUOTE_CREATED", "PAYMENT_INSTRUCTIONS_ISSUED", "AWAITING_LOCAL_PAYMENT"].includes(t.status))) {
        stamp(t, "PAYMENT_EXPIRED", payExpired ? "payment instructions expired" : "quote expired");
        this.store.saveTransfer(t);
        return true;
      }
    } catch {
      // Missing quote — don't block operator flow.
    }
    return false;
  }

  markDetected(paymentId: string): Transfer {
    const t = this.store.getByPayment(paymentId);
    if (this.expireIfStale(t)) throw new Error("Payment expired — create a new transfer for a fresh quote");
    // Idempotent for operator double-clicks / webhook retries.
    if (t.status === "PAYMENT_DETECTED" || t.status === "PAYMENT_UNDER_REVIEW") return t;
    if (t.status !== "AWAITING_LOCAL_PAYMENT") {
      throw new Error(`Cannot mark detected from ${t.status}`);
    }
    stamp(t, "PAYMENT_DETECTED", "possible match found; NOT yet verified");
    stamp(t, "PAYMENT_UNDER_REVIEW");
    this.store.saveTransfer(t);
    return t;
  }

  async verifyPayment(paymentId: string, method: "operator" | "auto" = "operator"): Promise<Transfer> {
    const t = this.store.getByPayment(paymentId);
    if (this.expireIfStale(t)) throw new Error("Payment expired — create a new transfer for a fresh quote");
    if (t.status === "PAYMENT_VERIFIED") return t; // idempotent retry
    const corridor = getCorridor(t.corridorId);
    const adapter = this.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
    const res = await adapter.verifyPayment(paymentId);
    if (!res.verified) {
      stamp(t, "PAYMENT_REJECTED", res.reason ?? "verification failed");
      this.store.saveTransfer(t);
      return t;
    }
    if (t.status === "AWAITING_LOCAL_PAYMENT") {
      stamp(t, "PAYMENT_DETECTED", `${method} verification`);
      stamp(t, "PAYMENT_UNDER_REVIEW");
    } else if (t.status === "PAYMENT_DETECTED") {
      stamp(t, "PAYMENT_UNDER_REVIEW");
    } else if (t.status !== "PAYMENT_UNDER_REVIEW") {
      throw new Error(`Cannot verify from ${t.status}`);
    }
    stamp(t, "PAYMENT_VERIFIED", `method=${res.method}`);
    this.store.saveTransfer(t);
    return t;
  }

  async settleToPollar(transferId: string): Promise<Transfer> {
    const t = this.store.getTransfer(transferId);
    if (this.expireIfStale(t)) throw new Error("Payment expired — create a new transfer for a fresh quote");
    if (t.status === "COMPLETED") return t; // idempotent settle retry
    if (t.status !== "PAYMENT_VERIFIED") throw new Error("USDC releases only after PAYMENT_VERIFIED");
    stamp(t, "USDC_SETTLEMENT_PENDING");
    try {
      const wallet = await ensureWallet(t.transferId);
      // Deferred funding trigger: African verification approves the Pollar wallet.
      const fund = await fundDeferredWallet(wallet);
      stamp(t, "USDC_SETTLED_TO_POLLAR", `wallet=${wallet} fund=${fund.mode}`);
      const s = await settleUsdc(wallet, t.settlementAmount);
      t.pollarWallet = s.wallet;
      t.pollarTxHash = s.txHash;
      t.pollarMode = s.mode;
      stamp(t, "POLLAR_TRANSFER_SUBMITTED", s.txHash);
      const sub = await submitPollarTransfer(s.txHash);
      if (!sub.confirmed) {
        stamp(t, "PAYOUT_FAILED", "pollar transfer not confirmed");
        this.store.saveTransfer(t);
        return t;
      }
      stamp(t, "POLLAR_TRANSFER_CONFIRMED", sub.payoutRef);
      stamp(t, "DESTINATION_PAYOUT_PENDING");
      stamp(t, "COMPLETED", sub.payoutRef);
      this.store.saveTransfer(t);
      return t;
    } catch (e) {
      try {
        stamp(t, "SETTLEMENT_FAILED", e instanceof Error ? e.message : "settlement failed");
      } catch {
        // already in a failed state — keep original error
      }
      this.store.saveTransfer(t);
      throw e;
    }
  }

  rejectPayment(paymentId: string, reason: string): Transfer {
    const t = this.store.getByPayment(paymentId);
    stamp(t, "PAYMENT_REJECTED", reason);
    this.store.saveTransfer(t);
    return t;
  }

  // Spec §24.3 refund states: REFUND_PENDING -> REFUNDED via the same adapter contract.
  // Falls back to a clearly-labeled manual refund when the adapter can't auto-refund
  // (e.g. mobile-money cash-out), so operator flow never dead-ends.
  async refundPayment(paymentId: string, reason = "operator refund"): Promise<Transfer> {
    const t = this.store.getByPayment(paymentId);
    if (t.status === "REFUNDED") return t;
    const corridor = getCorridor(t.corridorId);
    const adapter = this.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
    const res = await adapter.refundPayment(paymentId);
    if (!res.refunded) {
      const caps = adapter.capabilities();
      if (caps.manualVerification) {
        if (t.status !== "REFUND_PENDING") stamp(t, "REFUND_PENDING", `${reason} (manual — ${res.reason ?? "auto-refund unsupported"})`);
        stamp(t, "REFUNDED", `${reason} (manual)`);
        this.store.saveTransfer(t);
        return t;
      }
      throw new Error(res.reason ?? "refund unsupported by provider");
    }
    if (t.status !== "REFUND_PENDING") stamp(t, "REFUND_PENDING", reason);
    stamp(t, "REFUNDED", reason);
    this.store.saveTransfer(t);
    return t;
  }

  get(id: string): Transfer {
    return this.store.getTransfer(id);
  }

  getByShareToken(token: string): Transfer {
    const found = this.store.listTransfers(1000, 0).find((t) => t.shareToken === token);
    if (!found) throw new Error("Unknown tracking link");
    return found;
  }

  // Clean handoff receipt for judges/frontend: African rail + Pollar + mocked BOB.
  getHandoff(transferId: string) {
    const t = this.store.getTransfer(transferId);
    const corridor = getCorridor(t.corridorId);
    if (!t.pollarWallet || !t.pollarTxHash) throw new Error("Transfer not yet settled to Pollar");
    return buildHandoffReceipt({
      transferId: t.transferId,
      country: corridor.sourceCountry,
      rail: corridor.sourceRail,
      provider: corridor.providerId,
      reference: t.reference,
      settlement: {
        wallet: t.pollarWallet,
        txHash: t.pollarTxHash,
        amountUsdc: t.settlementAmount,
        env: (process.env.POLLAR_ENV === "live" ? "live" : "testnet"),
        mode: t.pollarMode ?? "mock",
      },
      payoutRef: t.history.find((h) => h.status === "COMPLETED")?.note ?? "BOB-MOCK-pending",
    });
  }

  list(limit = 100, offset = 0): Transfer[] {
    return this.store.listTransfers(limit, offset);
  }
}

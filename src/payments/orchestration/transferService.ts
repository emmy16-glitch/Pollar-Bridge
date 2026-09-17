import { v4 as uuid } from "uuid";
import type { Transfer, TransferStatus } from "../../types.js";
import { getCorridor } from "../corridors/corridorRegistry.js";
import type { ProviderRegistry } from "../providers/providerRegistry.js";
import { MemoryStore } from "../../store/memoryStore.js";
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
}

export class TransferService {
  constructor(
    private registry: ProviderRegistry,
    private store: MemoryStore,
    private quotes: QuoteService,
  ) {}

  createTransfer(corridorId: string, sourceAmount: number, senderName?: string): Transfer {
    const corridor = getCorridor(corridorId);
    const quote = this.quotes.createQuote({ corridorId, sourceAmount });
    this.store.saveQuote(quote);
    const reference = `PB-${uuid().slice(0, 8).toUpperCase()}`;
    const t: Transfer = {
      transferId: `tr_${uuid().slice(0, 8)}`,
      corridorId,
      quoteId: quote.quoteId,
      paymentId: "",
      reference,
      shareToken: uuid().replace(/-/g, "").slice(0, 12),
      sourceAmount,
      totalRequired: quote.totalRequired,
      settlementAmount: quote.settlementAmount,
      status: "QUOTE_CREATED",
      history: [{ status: "QUOTE_CREATED", at: now(), note: `sender=${senderName ?? "anon"}` }],
      createdAt: now(),
      updatedAt: now(),
    };
    void corridor;
    this.store.saveTransfer(t);
    return t;
  }

  async issuePaymentInstructions(transferId: string): Promise<Transfer> {
    const t = this.store.getTransfer(transferId);
    const quote = this.store.getQuote(t.quoteId);
    const corridor = getCorridor(t.corridorId);
    const adapter = this.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
    const instruction = await adapter.createPayment({
      quoteId: quote.quoteId,
      reference: t.reference,
      localAmount: t.totalRequired,
    });
    t.paymentId = instruction.paymentId;
    // re-index payment -> transfer
    this.store.saveTransfer(t);
    stamp(t, "PAYMENT_INSTRUCTIONS_ISSUED", `provider=${adapter.providerId}`);
    stamp(t, "AWAITING_LOCAL_PAYMENT");
    return t;
  }

  markDetected(paymentId: string): Transfer {
    const t = this.store.getByPayment(paymentId);
    if (t.status === "AWAITING_LOCAL_PAYMENT") {
      stamp(t, "PAYMENT_DETECTED", "possible match found; NOT yet verified");
      stamp(t, "PAYMENT_UNDER_REVIEW");
    }
    return t;
  }

  async verifyPayment(paymentId: string, method: "operator" | "auto" = "operator"): Promise<Transfer> {
    const t = this.store.getByPayment(paymentId);
    const corridor = getCorridor(t.corridorId);
    const adapter = this.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
    const res = await adapter.verifyPayment(paymentId);
    if (!res.verified) {
      stamp(t, "PAYMENT_REJECTED", res.reason ?? "verification failed");
      return t;
    }
    if (t.status === "AWAITING_LOCAL_PAYMENT") {
      stamp(t, "PAYMENT_DETECTED", `${method} verification`);
      stamp(t, "PAYMENT_UNDER_REVIEW");
    } else if (t.status === "PAYMENT_DETECTED") {
      stamp(t, "PAYMENT_UNDER_REVIEW");
    }
    stamp(t, "PAYMENT_VERIFIED", `method=${res.method}`);
    return t;
  }

  async settleToPollar(transferId: string): Promise<Transfer> {
    const t = this.store.getTransfer(transferId);
    if (t.status !== "PAYMENT_VERIFIED") throw new Error("USDC releases only after PAYMENT_VERIFIED");
    stamp(t, "USDC_SETTLEMENT_PENDING");
    const wallet = await ensureWallet(t.transferId);
    // Deferred funding trigger: African verification approves the Pollar wallet.
    const fund = await fundDeferredWallet(wallet);
    stamp(t, "USDC_SETTLED_TO_POLLAR", `wallet=${wallet} fund=${fund.mode}`);
    const s = await settleUsdc(wallet, t.settlementAmount);
    t.pollarWallet = s.wallet;
    t.pollarTxHash = s.txHash;
    stamp(t, "POLLAR_TRANSFER_SUBMITTED", s.txHash);
    const sub = await submitPollarTransfer(s.txHash);
    if (!sub.confirmed) {
      stamp(t, "PAYOUT_FAILED", "pollar transfer not confirmed");
      return t;
    }
    stamp(t, "POLLAR_TRANSFER_CONFIRMED", sub.payoutRef);
    stamp(t, "DESTINATION_PAYOUT_PENDING");
    stamp(t, "COMPLETED", sub.payoutRef);
    return t;
  }

  rejectPayment(paymentId: string, reason: string): Transfer {
    const t = this.store.getByPayment(paymentId);
    stamp(t, "PAYMENT_REJECTED", reason);
    return t;
  }

  // Spec §24.3 refund states: REFUND_PENDING -> REFUNDED via the same adapter contract.
  async refundPayment(paymentId: string, reason = "operator refund"): Promise<Transfer> {
    const t = this.store.getByPayment(paymentId);
    const corridor = getCorridor(t.corridorId);
    const adapter = this.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
    const res = await adapter.refundPayment(paymentId);
    if (!res.refunded) throw new Error(res.reason ?? "refund unsupported by provider");
    if (t.status !== "REFUND_PENDING") stamp(t, "REFUND_PENDING", reason);
    stamp(t, "REFUNDED", reason);
    return t;
  }

  get(id: string): Transfer {
    return this.store.getTransfer(id);
  }

  getByShareToken(token: string): Transfer {
    const found = this.store.listTransfers().find((t) => t.shareToken === token);
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
        mode: t.pollarTxHash.startsWith("0x") ? "mock" : "mock",
      },
      payoutRef: t.history.find((h) => h.status === "COMPLETED")?.note ?? "BOB-MOCK-pending",
    });
  }

  list(): Transfer[] {
    return this.store.listTransfers();
  }
}

import { v4 as uuid } from "uuid";
import type {
  CancelResult,
  PaymentInstruction,
  PaymentRequest,
  PaymentStatus,
  ProviderCapabilities,
  QuoteRequest,
  Quote,
  RefundResult,
  VerificationResult,
} from "../../../types.js";
import type { LocalRailProvider } from "../LocalRailProvider.js";
import { assertPaymentId, assertPaymentRequest } from "../../../validation.js";

export class SandboxMobileMoneyProvider implements LocalRailProvider {
  readonly providerId: string;
  private currency: string;
  private payments = new Map<string, { status: PaymentStatus["status"]; reference: string; amount: number }>();

  constructor(providerId = "gh-demo-momo", currency = "GHS") {
    this.providerId = providerId;
    this.currency = currency;
  }

  capabilities(): ProviderCapabilities {
    return {
      quotes: true,
      paymentCreation: true,
      webhooks: false,
      statusPolling: true,
      refunds: false,
      automatedSettlement: false,
      manualVerification: true,
    };
  }

  async getQuote(_req: QuoteRequest): Promise<Quote> {
    throw new Error("Quotes are issued by QuoteService for sandbox providers");
  }

  async createPayment(req: PaymentRequest): Promise<PaymentInstruction> {
    assertPaymentRequest(req, this.providerId);
    const paymentId = `momo_${uuid().slice(0, 8)}`;
    this.payments.set(paymentId, { status: "awaiting_payment", reference: req.reference, amount: req.localAmount });
    return {
      paymentId,
      status: "PAYMENT_INSTRUCTIONS_ISSUED",
      instructions: {
        paybill: "*170#",
        accountName: "PollarBridge Sandbox MoMo",
        reference: req.reference,
        amount: req.localAmount,
        currency: this.currency,
        note: "Sandbox mobile money. Approve the prompt or wait for operator confirmation.",
      },
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    assertPaymentId(paymentId, this.providerId);
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    return { paymentId, status: p.status, raw: { reference: p.reference, amount: p.amount } };
  }

  simulateIncomingPayment(paymentId: string): void {
    assertPaymentId(paymentId, this.providerId);
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    p.status = "detected";
  }

  async verifyPayment(paymentId: string): Promise<VerificationResult> {
    assertPaymentId(paymentId, this.providerId);
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    p.status = "verified";
    return { verified: true, method: "operator_confirmation" };
  }

  async cancelPayment(paymentId: string): Promise<CancelResult> {
    assertPaymentId(paymentId, this.providerId);
    this.payments.delete(paymentId);
    return { cancelled: true, paymentId };
  }

  async refundPayment(paymentId: string): Promise<RefundResult> {
    assertPaymentId(paymentId, this.providerId);
    return { refunded: false, paymentId, reason: "sandbox momo refunds unsupported" };
  }
}

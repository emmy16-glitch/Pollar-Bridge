import { v4 as uuid } from "uuid";
import type {
  CancelResult,
  PaymentInstruction,
  PaymentRequest,
  PaymentStatus,
  ProviderCapabilities,
  Quote,
  QuoteRequest,
  RefundResult,
  VerificationResult,
} from "../../../types.js";
import type { LocalRailProvider } from "../LocalRailProvider.js";
import { assertPaymentId, assertPaymentRequest } from "../../../validation.js";

// Agent-assisted cash: user gets a code, agent confirms cash-in (spec rail).
export class SandboxAgentProvider implements LocalRailProvider {
  readonly providerId: string;
  private currency: string;
  private payments = new Map<string, { status: PaymentStatus["status"]; reference: string; amount: number }>();

  constructor(providerId = "ke-demo-agent", currency = "KES") {
    this.providerId = providerId;
    this.currency = currency;
  }

  capabilities(): ProviderCapabilities {
    return {
      quotes: true,
      paymentCreation: true,
      webhooks: false,
      statusPolling: true,
      refunds: true,
      automatedSettlement: false,
      manualVerification: true,
    };
  }

  async getQuote(_req: QuoteRequest): Promise<Quote> {
    throw new Error("Quotes are issued by QuoteService for sandbox providers");
  }

  async createPayment(req: PaymentRequest): Promise<PaymentInstruction> {
    assertPaymentRequest(req, this.providerId);
    const paymentId = `agent_${uuid().slice(0, 8)}`;
    this.payments.set(paymentId, { status: "awaiting_payment", reference: req.reference, amount: req.localAmount });
    return {
      paymentId,
      status: "PAYMENT_INSTRUCTIONS_ISSUED",
      instructions: {
        accountName: "PollarBridge Agent Network",
        reference: req.reference,
        amount: req.localAmount,
        currency: this.currency,
        note: "Sandbox agent cash-in. Show this code to the agent; agent confirms receipt.",
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
    return { refunded: true, paymentId, reason: "sandbox agent refund" };
  }
}

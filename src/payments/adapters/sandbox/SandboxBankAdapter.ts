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
import { assertPaymentId, assertPaymentRequest } from "../../../validation.js";
import type { LocalRailProvider } from "../LocalRailProvider.js";

interface SandboxPayment {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus["status"];
  verified: boolean;
}

// Behaves like a real provider: instructions -> awaiting -> detected/review -> verified.
// No instant-credit shortcut (spec Layer 17).
export class SandboxBankProvider implements LocalRailProvider {
  readonly providerId: string;
  private currency: string;
  private payments = new Map<string, SandboxPayment>();

  constructor(providerId = "ng-demo-bank", currency = "NGN") {
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

  async getQuote(req: QuoteRequest): Promise<Quote> {
    throw new Error("Quotes are issued by QuoteService for sandbox providers");
  }

  async createPayment(req: PaymentRequest): Promise<PaymentInstruction> {
    assertPaymentRequest(req, this.providerId);
    const paymentId = `pay_${uuid().slice(0, 8)}`;
    this.payments.set(paymentId, {
      paymentId,
      reference: req.reference,
      amount: req.localAmount,
      currency: this.currency,
      status: "awaiting_payment",
      verified: false,
    });
    return {
      paymentId,
      status: "PAYMENT_INSTRUCTIONS_ISSUED",
      instructions: {
        accountName: "PollarBridge Sandbox",
        accountNumber: "0001234567",
        reference: req.reference,
        amount: req.localAmount,
        currency: this.currency,
        note: "Sandbox bank transfer. Include the reference exactly. Operator confirms receipt.",
      },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    assertPaymentId(paymentId, this.providerId);
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    return { paymentId, status: p.status, raw: { reference: p.reference, amount: p.amount } };
  }

  // Test helper: simulate user paying (detection, NOT verification).
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
    p.verified = true;
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
    return { refunded: true, paymentId, reason: "sandbox refund" };
  }
}

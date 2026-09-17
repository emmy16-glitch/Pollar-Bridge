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

export class SandboxP2PProvider implements LocalRailProvider {
  readonly providerId = "ng-demo-p2p";
  private payments = new Map<string, { status: PaymentStatus["status"] }>();

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
    const paymentId = `p2p_${uuid().slice(0, 8)}`;
    this.payments.set(paymentId, { status: "awaiting_payment" });
    return {
      paymentId,
      status: "PAYMENT_INSTRUCTIONS_ISSUED",
      instructions: {
        accountName: "PollarBridge P2P Operator",
        reference: req.reference,
        amount: req.localAmount,
        currency: "NGN",
        note: "Sandbox P2P. Upload proof in the web app; operator releases after review.",
      },
      expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    return { paymentId, status: p.status };
  }

  simulateIncomingPayment(paymentId: string): void {
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    p.status = "detected";
  }

  async verifyPayment(paymentId: string): Promise<VerificationResult> {
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`Unknown payment: ${paymentId}`);
    p.status = "verified";
    return { verified: true, method: "operator_confirmation" };
  }

  async cancelPayment(paymentId: string): Promise<CancelResult> {
    this.payments.delete(paymentId);
    return { cancelled: true, paymentId };
  }

  async refundPayment(paymentId: string): Promise<RefundResult> {
    return { refunded: true, paymentId, reason: "sandbox p2p refund" };
  }
}

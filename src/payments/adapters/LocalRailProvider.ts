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
} from "../../types.js";

/**
 * Stable provider interface (spec Layer 3).
 * Every local-rail adapter — sandbox or live — implements this.
 * Orchestration must never branch on concrete class.
 */
export interface LocalRailProvider {
  readonly providerId: string;
  capabilities(): ProviderCapabilities;
  getQuote(request: QuoteRequest): Promise<Quote>;
  createPayment(request: PaymentRequest): Promise<PaymentInstruction>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  verifyPayment(paymentId: string): Promise<VerificationResult>;
  cancelPayment(paymentId: string): Promise<CancelResult>;
  refundPayment(paymentId: string): Promise<RefundResult>;
}

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

export class GhanaMobileMoneyLiveProvider implements LocalRailProvider {
  readonly providerId = "gh-live-momo";
  capabilities(): ProviderCapabilities {
    return {
      quotes: true,
      paymentCreation: true,
      webhooks: true,
      statusPolling: true,
      refunds: true,
      automatedSettlement: true,
      manualVerification: false,
    };
  }
  async getQuote(_req: QuoteRequest): Promise<Quote> {
    if (!process.env.GH_MOBILE_LIVE_API_KEY) throw new Error("Missing live credential: GH_MOBILE_LIVE_API_KEY");
    throw new Error("Live Ghana momo quote not yet integrated (Phase 4)");
  }
  async createPayment(_req: PaymentRequest): Promise<PaymentInstruction> {
    if (!process.env.GH_MOBILE_LIVE_API_KEY) throw new Error("Missing live credential: GH_MOBILE_LIVE_API_KEY");
    throw new Error("Live Ghana momo payment not yet integrated (Phase 4)");
  }
  async getPaymentStatus(_p: string): Promise<PaymentStatus> {
    throw new Error("Not integrated");
  }
  async verifyPayment(_p: string): Promise<VerificationResult> {
    throw new Error("Not integrated");
  }
  async cancelPayment(paymentId: string): Promise<CancelResult> {
    return { cancelled: false, paymentId };
  }
  async refundPayment(paymentId: string): Promise<RefundResult> {
    return { refunded: false, paymentId, reason: "not integrated" };
  }
}

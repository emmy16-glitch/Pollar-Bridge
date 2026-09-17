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

function needCreds(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing live credential: ${name} (refused to run live without it)`);
  return v;
}

// Stub live adapter — same contract, real API calls go here in Phase 4.
// Never enabled without credentials + compliance sign-off.
export class NigeriaBankLiveProvider implements LocalRailProvider {
  readonly providerId = "ng-live-bank";
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
    needCreds("NG_BANK_LIVE_API_KEY");
    throw new Error("Live Nigeria bank quote not yet integrated (Phase 4)");
  }
  async createPayment(_req: PaymentRequest): Promise<PaymentInstruction> {
    needCreds("NG_BANK_LIVE_API_KEY");
    throw new Error("Live Nigeria bank payment not yet integrated (Phase 4)");
  }
  async getPaymentStatus(_paymentId: string): Promise<PaymentStatus> {
    needCreds("NG_BANK_LIVE_API_KEY");
    throw new Error("Not integrated");
  }
  async verifyPayment(_paymentId: string): Promise<VerificationResult> {
    needCreds("NG_BANK_LIVE_API_KEY");
    throw new Error("Not integrated");
  }
  async cancelPayment(paymentId: string): Promise<CancelResult> {
    return { cancelled: false, paymentId };
  }
  async refundPayment(paymentId: string): Promise<RefundResult> {
    return { refunded: false, paymentId, reason: "not integrated" };
  }
}

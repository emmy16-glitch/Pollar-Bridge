// Central domain types — mirrors spec sections 6,7,10,11,13,15.
// Workflow stays the same. Config/adapters change around it.

export type RuntimeMode = "sandbox" | "pilot" | "live";
export type RailType = "bank_transfer" | "mobile_money" | "p2p" | "agent";

export interface TransferLimits {
  minimum: number;
  maximum: number;
  dailyMaximum: number;
}

export interface VerificationPolicy {
  paymentProofRequired: boolean;
  operatorReviewRequired: boolean;
  kycLevel: "none" | "basic" | "full";
}

export interface SettlementPolicy {
  currency: "USDC";
  settlementMode: "operator_credit" | "automated";
}

export interface RailConfig {
  type: RailType;
  providerId: string;
  mode: RuntimeMode;
  enabled: boolean;
}

export interface CountryConfig {
  countryCode: string; // ISO e.g. NG
  name: string;
  currency: string; // e.g. NGN
  supported: boolean;
  mode: RuntimeMode;
  rails: RailConfig[];
  limits: TransferLimits;
  verification: VerificationPolicy;
  settlement: SettlementPolicy;
}

export interface Corridor {
  id: string; // e.g. NG-NGN-BANK-BO-USDC
  sourceCountry: string;
  sourceCurrency: string;
  sourceRail: RailType;
  destinationCountry: string; // e.g. BO
  settlementAsset: "USDC";
  destinationAsset: "BOB";
  mode: RuntimeMode;
  providerId: string;
  enabled: boolean;
  minimumAmount: number;
  maximumAmount: number;
}

export type TransferStatus =
  | "QUOTE_CREATED"
  | "PAYMENT_INSTRUCTIONS_ISSUED"
  | "AWAITING_LOCAL_PAYMENT"
  | "PAYMENT_DETECTED"
  | "PAYMENT_UNDER_REVIEW"
  | "PAYMENT_VERIFIED"
  | "USDC_SETTLEMENT_PENDING"
  | "USDC_SETTLED_TO_POLLAR"
  | "POLLAR_TRANSFER_SUBMITTED"
  | "POLLAR_TRANSFER_CONFIRMED"
  | "DESTINATION_PAYOUT_PENDING"
  | "COMPLETED"
  | "PAYMENT_EXPIRED"
  | "PAYMENT_REJECTED"
  | "SETTLEMENT_FAILED"
  | "PAYOUT_FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface QuoteRequest {
  corridorId: string;
  sourceAmount: number;
}

export interface Quote {
  quoteId: string;
  corridorId: string;
  sourceCurrency: string;
  sourceAmount: number;
  settlementAsset: "USDC";
  settlementAmount: number;
  exchangeRate: number;
  providerFee: number;
  platformFee: number;
  totalFees: number;
  netAmount: number;
  /** Amount the sender must actually pay (source + fees where applicable). */
  totalRequired: number;
  /** Amount due kept explicit for the pay-sheet UI (equals totalRequired). */
  amountDue: number;
  expiry: string; // ISO
  source: "provider" | "aggregator" | "manual";
  simulated: boolean;
}

export interface PaymentRequest {
  quoteId: string;
  reference: string;
  localAmount: number;
  senderName?: string;
}

export interface PaymentInstruction {
  paymentId: string;
  status: TransferStatus;
  instructions: {
    accountName?: string;
    accountNumber?: string;
    paybill?: string;
    reference: string;
    amount: number;
    currency: string;
    note: string;
  };
  expiresAt: string;
}

export type PaymentStatusValue = "awaiting_payment" | "detected" | "under_review" | "verified" | "rejected" | "expired";

export interface PaymentStatus {
  paymentId: string;
  status: PaymentStatusValue;
  raw?: unknown;
}

export interface VerificationResult {
  verified: boolean;
  method: "operator_confirmation" | "webhook" | "polling" | "reconciliation";
  reason?: string;
}

export interface CancelResult {
  cancelled: boolean;
  paymentId: string;
}

export interface RefundResult {
  refunded: boolean;
  paymentId: string;
  reason?: string;
}

export interface ProviderCapabilities {
  quotes: boolean;
  paymentCreation: boolean;
  webhooks: boolean;
  statusPolling: boolean;
  refunds: boolean;
  automatedSettlement: boolean;
  manualVerification: boolean;
}

export interface RailAvailability {
  country: string;
  rail: RailType;
  provider: string;
  mode: RuntimeMode;
  capabilities: ProviderCapabilities;
  status: "available" | "manual" | "coming_soon" | "disabled";
}

export interface Transfer {
  transferId: string;
  corridorId: string;
  quoteId: string;
  paymentId: string;
  reference: string;
  // UNIQUE EDGE: public share token for recipient tracking links.
  // Safe to put in a URL — reveals status/timeline only, never PII/secrets.
  shareToken: string;
  /** Recipient details are private transfer data; never include them in public timelines/listings. */
  recipientName?: string;
  recipientWalletAddress?: string;
  /** Idempotency key supplied on creation (header or body), for safe retries. */
  idempotencyKey?: string;
  sourceAmount: number;
  totalRequired: number;
  /** Exact amount the sender must pay on the local rail. */
  amountDue?: number;
  totalFees?: number;
  settlementAmount: number;
  status: TransferStatus;
  history: { status: TransferStatus; at: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
  /** Copied from the provider so the frontend pay-sheet never needs a 2nd fetch. */
  instructions?: PaymentInstruction["instructions"];
  paymentExpiresAt?: string;
  pollarTxHash?: string;
  pollarWallet?: string;
  pollarMode?: "real" | "mock";
}

export interface ReconciliationRecord {
  transferId: string;
  expectedLocalAmount: number;
  receivedLocalAmount?: number;
  expectedUsdcAmount: number;
  creditedUsdcAmount?: number;
  localPaymentStatus: string;
  settlementStatus: string;
  variance: number;
  action: "release" | "hold" | "refund" | "manual_review";
}

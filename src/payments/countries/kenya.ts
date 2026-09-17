import type { CountryConfig } from "../../types.js";

export const kenyaConfig: CountryConfig = {
  countryCode: "KE",
  name: "Kenya",
  currency: "KES",
  supported: false,
  mode: "sandbox",
  rails: [
    { type: "mobile_money", providerId: "ke-demo-momo", mode: "sandbox", enabled: false },
    { type: "agent", providerId: "ke-demo-agent", mode: "sandbox", enabled: false },
  ],
  limits: { minimum: 200, maximum: 500000, dailyMaximum: 1000000 },
  verification: { paymentProofRequired: true, operatorReviewRequired: true, kycLevel: "basic" },
  settlement: { currency: "USDC", settlementMode: "operator_credit" },
};

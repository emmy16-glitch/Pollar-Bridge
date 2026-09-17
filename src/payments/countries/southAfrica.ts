import type { CountryConfig } from "../../types.js";

export const southAfricaConfig: CountryConfig = {
  countryCode: "ZA",
  name: "South Africa",
  currency: "ZAR",
  supported: false,
  mode: "sandbox",
  rails: [
    { type: "bank_transfer", providerId: "za-demo-bank", mode: "sandbox", enabled: false },
    { type: "p2p", providerId: "za-demo-p2p", mode: "sandbox", enabled: false },
  ],
  limits: { minimum: 100, maximum: 200000, dailyMaximum: 400000 },
  verification: { paymentProofRequired: true, operatorReviewRequired: true, kycLevel: "basic" },
  settlement: { currency: "USDC", settlementMode: "operator_credit" },
};

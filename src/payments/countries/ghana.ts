import type { CountryConfig } from "../../types.js";

export const ghanaConfig: CountryConfig = {
  countryCode: "GH",
  name: "Ghana",
  currency: "GHS",
  supported: true,
  mode: "sandbox",
  rails: [
    { type: "mobile_money", providerId: "gh-demo-momo", mode: "sandbox", enabled: true },
    { type: "bank_transfer", providerId: "gh-demo-bank", mode: "sandbox", enabled: false },
  ],
  limits: { minimum: 50, maximum: 60000, dailyMaximum: 120000 },
  verification: { paymentProofRequired: true, operatorReviewRequired: true, kycLevel: "basic" },
  settlement: { currency: "USDC", settlementMode: "operator_credit" },
};

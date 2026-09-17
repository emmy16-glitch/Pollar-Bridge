import { v4 as uuid } from "uuid";
import type { CountryConfig } from "../../types.js";

export const nigeriaConfig: CountryConfig = {
  countryCode: "NG",
  name: "Nigeria",
  currency: "NGN",
  supported: true,
  mode: "sandbox",
  rails: [
    { type: "bank_transfer", providerId: "ng-demo-bank", mode: "sandbox", enabled: true },
    { type: "p2p", providerId: "ng-demo-p2p", mode: "sandbox", enabled: true },
  ],
  limits: { minimum: 1000, maximum: 500000, dailyMaximum: 1000000 },
  verification: { paymentProofRequired: true, operatorReviewRequired: true, kycLevel: "basic" },
  settlement: { currency: "USDC", settlementMode: "operator_credit" },
};

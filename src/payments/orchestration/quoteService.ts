import { v4 as uuid } from "uuid";
import type { Quote, QuoteRequest } from "../../types.js";
import { getCorridor } from "../corridors/corridorRegistry.js";

// Layer 7: normalizes local amount -> fees -> USDC. States rate source.
// Sandbox rates are visibly simulated.
const SANDBOX_RATES: Record<string, number> = {
  "NG-NGN-BANK-BO-USDC": 0.00062, // 1 NGN -> USDC (simulated)
  "NG-NGN-P2P-BO-USDC": 0.0006,
  "GH-GHS-MOBILE-BO-USDC": 0.065,
  "KE-KES-MOBILE-BO-USDC": 0.0077,
  "ZA-ZAR-BANK-BO-USDC": 0.055,
};

export class QuoteService {
  createQuote(req: QuoteRequest): Quote {
    const corridor = getCorridor(req.corridorId);
    if (!corridor.enabled) throw new Error(`Corridor disabled: ${req.corridorId}`);
    if (req.sourceAmount < corridor.minimumAmount || req.sourceAmount > corridor.maximumAmount) {
      throw new Error(`Amount out of corridor limits (${corridor.minimumAmount}-${corridor.maximumAmount})`);
    }
    const rate = SANDBOX_RATES[corridor.id];
    if (!rate) throw new Error(`No rate for corridor: ${corridor.id}`);
    const providerFee = Math.max(1, Math.round(req.sourceAmount * 0.008));
    const platformFee = Math.max(1, Math.round(req.sourceAmount * 0.007));
    const totalFees = providerFee + platformFee;
    const net = req.sourceAmount - totalFees;
    const settlementAmount = Math.round(net * rate * 100) / 100;
    return {
      quoteId: `q_${uuid().slice(0, 8)}`,
      corridorId: corridor.id,
      sourceCurrency: corridor.sourceCurrency,
      sourceAmount: req.sourceAmount,
      settlementAsset: "USDC",
      settlementAmount,
      exchangeRate: rate,
      providerFee,
      platformFee,
      totalFees,
      netAmount: net,
      // amountDue is what the sender actually pays on the local rail.
      // Fees are taken from the payout (net * rate), so amountDue == sourceAmount
      // and variance math in reconciliation stays exact.
      totalRequired: req.sourceAmount,
      amountDue: req.sourceAmount,
      expiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      source: "manual",
      simulated: corridor.mode === "sandbox",
    };
  }
}

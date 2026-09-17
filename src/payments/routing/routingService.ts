import type { Quote } from "../../types.js";
import { listCorridors } from "../corridors/corridorRegistry.js";
import { QuoteService } from "../orchestration/quoteService.js";

export interface RailRecommendation {
  corridorId: string;
  rail: string;
  provider: string;
  totalRequired: number;
  amountDue: number;
  settlementAmount: number;
  totalFees: number;
  eta: string;
  healthy: boolean;
  label: "cheapest" | "fastest" | "standard";
}

// UNIQUE EDGE 1 — smart rail routing: compare all enabled corridors for a
// country + amount and rank by cost/speed instead of making the user guess.
// Demo hook: "NG 100,000 -> bank is cheapest, P2P is fastest for unverified users".
const ETA: Record<string, string> = {
  bank_transfer: "~10-30 min after operator confirm",
  mobile_money: "~5-15 min after operator confirm",
  p2p: "~15-45 min (operator escrow review)",
  agent: "~30-60 min (agent cash-in)",
};

export function recommendRails(
  countryCode: string,
  amount: number,
  quotes = new QuoteService(),
  isHealthy?: (providerId: string) => boolean,
): RailRecommendation[] {
  const options = listCorridors(true).filter((c) => c.sourceCountry === countryCode.toUpperCase());
  const recs: RailRecommendation[] = [];
  for (const c of options) {
    try {
      const q: Quote = quotes.createQuote({ corridorId: c.id, sourceAmount: amount });
      const healthy = isHealthy ? isHealthy(c.providerId) : true;
      recs.push({
        corridorId: c.id,
        rail: c.sourceRail,
        provider: c.providerId,
        totalRequired: q.totalRequired,
        amountDue: q.amountDue,
        settlementAmount: q.settlementAmount,
        totalFees: q.providerFee + q.platformFee,
        eta: ETA[c.sourceRail] ?? "~30 min",
        healthy,
        label: "standard",
      });
    } catch {
      // corridor limits exclude this amount — skip, don't fail the whole list
    }
  }
  // Healthy rails first, then best payout.
  recs.sort((a, b) => Number(b.healthy) - Number(a.healthy) || b.settlementAmount - a.settlementAmount);
  if (recs[0]) recs[0].label = "cheapest";
  const fastest = recs.find((r) => r.rail === "mobile_money" || r.rail === "p2p");
  if (fastest && fastest !== recs[0]) fastest.label = "fastest";
  return recs;
}

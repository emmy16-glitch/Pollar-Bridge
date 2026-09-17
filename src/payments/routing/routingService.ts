import type { Quote } from "../../types.js";
import { listCorridors } from "../corridors/corridorRegistry.js";
import { QuoteService } from "../orchestration/quoteService.js";

export interface RailRecommendation {
  corridorId: string;
  rail: string;
  provider: string;
  totalRequired: number;
  settlementAmount: number;
  totalFees: number;
  eta: string;
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

export function recommendRails(countryCode: string, amount: number, quotes = new QuoteService()): RailRecommendation[] {
  const options = listCorridors(true).filter((c) => c.sourceCountry === countryCode.toUpperCase());
  const recs: RailRecommendation[] = [];
  for (const c of options) {
    try {
      const q: Quote = quotes.createQuote({ corridorId: c.id, sourceAmount: amount });
      recs.push({
        corridorId: c.id,
        rail: c.sourceRail,
        provider: c.providerId,
        totalRequired: q.totalRequired,
        settlementAmount: q.settlementAmount,
        totalFees: q.providerFee + q.platformFee,
        eta: ETA[c.sourceRail] ?? "~30 min",
        label: "standard",
      });
    } catch {
      // corridor limits exclude this amount — skip, don't fail the whole list
    }
  }
  recs.sort((a, b) => b.settlementAmount - a.settlementAmount);
  if (recs[0]) recs[0].label = "cheapest";
  const fastest = recs.find((r) => r.rail === "mobile_money" || r.rail === "p2p");
  if (fastest && fastest !== recs[0]) fastest.label = "fastest";
  return recs;
}

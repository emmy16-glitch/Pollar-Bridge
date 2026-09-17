import type { Corridor } from "../../types.js";

// Explicit corridor model (spec Layer 2). Enabled only when
// adapter + credentials + limits + verification + settlement exist.
export const corridors: Corridor[] = [
  {
    id: "NG-NGN-BANK-BO-USDC",
    sourceCountry: "NG",
    sourceCurrency: "NGN",
    sourceRail: "bank_transfer",
    destinationCountry: "BO",
    settlementAsset: "USDC",
    destinationAsset: "BOB",
    mode: "sandbox",
    providerId: "ng-demo-bank",
    enabled: true,
    minimumAmount: 1000,
    maximumAmount: 500000,
  },
  {
    id: "NG-NGN-P2P-BO-USDC",
    sourceCountry: "NG",
    sourceCurrency: "NGN",
    sourceRail: "p2p",
    destinationCountry: "BO",
    settlementAsset: "USDC",
    destinationAsset: "BOB",
    mode: "sandbox",
    providerId: "ng-demo-p2p",
    enabled: true,
    minimumAmount: 1000,
    maximumAmount: 500000,
  },
  {
    id: "GH-GHS-MOBILE-BO-USDC",
    sourceCountry: "GH",
    sourceCurrency: "GHS",
    sourceRail: "mobile_money",
    destinationCountry: "BO",
    settlementAsset: "USDC",
    destinationAsset: "BOB",
    mode: "sandbox",
    providerId: "gh-demo-momo",
    enabled: true,
    minimumAmount: 50,
    maximumAmount: 60000,
  },
  {
    id: "KE-KES-MOBILE-BO-USDC",
    sourceCountry: "KE",
    sourceCurrency: "KES",
    sourceRail: "mobile_money",
    destinationCountry: "BO",
    settlementAsset: "USDC",
    destinationAsset: "BOB",
    mode: "sandbox",
    providerId: "ke-demo-momo",
    enabled: false,
    minimumAmount: 200,
    maximumAmount: 500000,
  },
  {
    id: "ZA-ZAR-BANK-BO-USDC",
    sourceCountry: "ZA",
    sourceCurrency: "ZAR",
    sourceRail: "bank_transfer",
    destinationCountry: "BO",
    settlementAsset: "USDC",
    destinationAsset: "BOB",
    mode: "sandbox",
    providerId: "za-demo-bank",
    enabled: false,
    minimumAmount: 100,
    maximumAmount: 200000,
  },
];

export function getCorridor(id: string): Corridor {
  const c = corridors.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown corridor: ${id}`);
  return c;
}

export function listCorridors(enabledOnly = false): Corridor[] {
  return enabledOnly ? corridors.filter((c) => c.enabled) : [...corridors];
}

// Spec §23.3: a corridor can be disabled without deleting its history.
export function setCorridorEnabled(id: string, enabled: boolean): Corridor {
  const c = getCorridor(id);
  c.enabled = enabled;
  return { ...c };
}

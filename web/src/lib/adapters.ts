// Translate Express-backend domain objects into the shapes the zip UI
// pages already render. Keeps frontend changes to zero: the `/api/*`
// handlers return the same `{ success, ... }` envelopes, sourced live
// from the backend instead of Postgres.

import type {
  BackendCorridor,
  BackendHealthEntry,
  BackendProviderReg,
  BackendTransfer,
} from "./backend";

const COUNTRY_NAME: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
};

// Sandbox USDC rates (source units per 1 USDC). Mirrors the backend
// QuoteService SANDBOX_RATES ( apparatus: rate = USDC per source ).
const SOURCE_PER_USDC: Record<string, string> = {
  NG: "1612.9000",
  GH: "15.3800",
  KE: "129.8700",
  ZA: "18.1800",
};

const BOB_PER_USDC = "6.9600";

export function countryCodeOf(corridor: BackendCorridor): string {
  return corridor.sourceCountry.toUpperCase();
}

export function uiCorridorId(countryCode: string): string {
  return `${countryCode.toUpperCase()}-BOB`;
}

function friendlyRail(rail: string): string {
  if (rail === "bank_transfer") return "Bank transfer";
  if (rail === "mobile_money") return "Mobile money";
  if (rail === "p2p") return "P2P Provider";
  return "Cash agent";
}

function friendlyProviderName(providerId: string, rail: string, country: string): string {
  const c = country.toUpperCase();
  if (c === "NG" && rail === "bank_transfer") return "Demo Bank (PollarBridge Sandbox)";
  if (c === "NG" && rail === "p2p") return "Demo Liquidity Agent (P2P)";
  if (c === "GH" && rail === "mobile_money") return "Sandbox Mobile Money (MTN / Telecel)";
  if (c === "GH" && rail === "bank_transfer") return "Sandbox Bank (Ghana)";
  if (c === "KE" && rail === "mobile_money") return "Sandbox M-Pesa (Kenya)";
  if (c === "KE" && rail === "agent") return "Sandbox Cash Agent (Kenya)";
  if (c === "ZA" && rail === "bank_transfer") return "Sandbox Ozow / Instant EFT";
  if (c === "ZA" && rail === "p2p") return "Sandbox P2P Desk (South Africa)";
  return `${providerId} (${rail})`;
}

function railBankDetails(rail: string, country: string): {
  bankName: string;
  accountNumber: string;
  accountName: string;
} {
  if (country === "NG" && rail === "bank_transfer")
    return { bankName: "PollarBridge Sandbox Bank", accountNumber: "0123456789", accountName: "PollarBridge Africa Escrow" };
  if (country === "NG")
    return { bankName: "Kuda Microfinance Desk", accountNumber: "2098451120", accountName: "Demo P2P Agent - Chinedu" };
  if (country === "GH" && rail === "mobile_money")
    return { bankName: "MTN Mobile Money Ghana", accountNumber: "+233 24 555 0192", accountName: "PollarBridge Ghana Merchant" };
  if (country === "KE" && rail === "mobile_money")
    return { bankName: "Safaricom M-Pesa Sandbox", accountNumber: "+254 722 000 000", accountName: "PollarBridge Kenya Merchant" };
  if (country === "KE")
    return { bankName: "PollarBridge Agent Network", accountNumber: "AG-KE-001", accountName: "PollarBridge Cash Agent" };
  return { bankName: "Standard Bank SA", accountNumber: "401928401", accountName: "PollarBridge SA PTY" };
}

// Backend has 5+ per-rail corridors; the UI shows 4 per-country cards.
export function buildUiCorridors(
  corridors: BackendCorridor[],
  providers: BackendProviderReg[],
) {
  const countries = ["NG", "GH", "KE", "ZA"];
  return countries.map((code) => {
    const rails = corridors.filter((c) => c.sourceCountry.toUpperCase() === code);
    const regs = providers.filter((p) => p.countryCode.toUpperCase() === code);
    const anyEnabled = rails.some((c) => c.enabled);
    const min = rails.length ? Math.min(...rails.map((c) => c.minimumAmount)) : 0;
    const max = rails.length ? Math.max(...rails.map((c) => c.maximumAmount)) : 0;
    return {
      id: uiCorridorId(code),
      fromCountry: COUNTRY_NAME[code] ?? code,
      fromCode: code,
      fromCurrency: COUNTRY_CURRENCY[code] ?? "",
      toCountry: "Bolivia",
      toCode: "BO",
      toCurrency: "BOB",
      usdcRate: SOURCE_PER_USDC[code] ?? "1608.2000",
      bobPerUsdc: BOB_PER_USDC,
      minAmount: String(min || 0),
      maxAmount: String(max || 0),
      status: rails.length === 0 ? "COMING_SOON" : anyEnabled ? "ACTIVE" : "COMING_SOON",
      description: `${COUNTRY_NAME[code] ?? code} local rails to Bolivia USDC settlement`,
      settlementSpeed: "5-20 min",
      providersCount: regs.length,
      backendCorridorIds: rails.map((c) => c.id),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function buildUiProviders(
  regs: BackendProviderReg[],
  corridors: BackendCorridor[],
  health: BackendHealthEntry[],
  capabilities: { provider: string; status: string }[] = [],
) {
  return regs.map((p) => {
    const code = p.countryCode.toUpperCase();
    const corridor = corridors.find((c) => c.providerId === p.providerId);
    const h = health.find((x) => x.providerId === p.providerId);
    const cap = capabilities.find((x) => x.provider === p.providerId);
    const enabled = corridor?.enabled ?? true;
    const healthy = h ? h.healthy : true;
    const status = !enabled
      ? cap?.status === "disabled"
        ? "Coming soon"
        : "Coming soon"
      : !healthy
        ? "Degraded"
        : p.mode === "live"
          ? "Locked"
          : "Healthy";
    const bank = railBankDetails(p.rail, code);
    return {
      id: p.providerId,
      name: friendlyProviderName(p.providerId, p.rail, code),
      corridorId: uiCorridorId(code),
      backendCorridorId: corridor?.id ?? "",
      railType: friendlyRail(p.rail),
      mode: p.mode === "live" ? "Live" : "Sandbox",
      status,
      estimatedDelivery: p.rail === "p2p" ? "2–5 minutes" : p.rail === "mobile_money" ? "5–10 minutes" : "10–20 minutes",
      fixedFee: p.rail === "mobile_money" ? "15.00" : "700.00",
      percentFee: p.rail === "mobile_money" ? "0.0050" : "0.0000",
      speedRank: p.rail === "p2p" ? "Fastest" : "Cheapest",
      verificationMethod: "Operator sandbox manual",
      totalCalls: h?.calls ?? 0,
      errorRate: String((h?.errorRate ?? 0) * 100),
      avgLatencyMs: h?.avgLatencyMs ?? 0,
      ...bank,
      corridorName: `${COUNTRY_NAME[code] ?? code} → Bolivia`,
      currency: COUNTRY_CURRENCY[code] ?? "",
      lastHealthCheck: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

// Backend lifecycle (18 states) -> UI badge states.
export function mapStatus(backendStatus: string): string {
  switch (backendStatus) {
    case "PAYMENT_INSTRUCTIONS_ISSUED":
    case "AWAITING_LOCAL_PAYMENT":
      return "INSTRUCTIONS_ISSUED";
    case "PAYMENT_UNDER_REVIEW":
      return "IN_REVIEW";
    case "PAYMENT_REJECTED":
      return "REJECTED";
    case "USDC_SETTLEMENT_PENDING":
    case "USDC_SETTLED_TO_POLLAR":
    case "POLLAR_TRANSFER_SUBMITTED":
    case "POLLAR_TRANSFER_CONFIRMED":
    case "DESTINATION_PAYOUT_PENDING":
      return "USDC_SETTLED";
    default:
      return backendStatus;
  }
}

function atOf(t: BackendTransfer, status: string): string | null {
  return t.history.find((h) => h.status === status)?.at ?? null;
}

export function backendTransferToUi(t: BackendTransfer, corridors: BackendCorridor[]) {
  const corridor = corridors.find((c) => c.id === t.corridorId);
  const code = corridor?.sourceCountry.toUpperCase() ?? "NG";
  const providerId = corridor?.providerId ?? "";
  const currency = corridor?.sourceCurrency ?? COUNTRY_CURRENCY[code] ?? "NGN";
  const providerFee = Math.max(1, Math.round(t.sourceAmount * 0.008));
  const pollarFee = Math.max(1, Math.round(t.sourceAmount * 0.007));
  const total = t.totalRequired ?? t.sourceAmount;
  const perUsdc = t.settlementAmount > 0 ? t.sourceAmount / t.settlementAmount : Number(SOURCE_PER_USDC[code] ?? 1608.2);
  const bob = t.settlementAmount * 6.96;
  return {
    id: t.reference,
    trackingToken: t.shareToken,
    senderName: "African Local Sender",
    senderEmail: "sender@pollarbridge.africa",
    sourceCountry: COUNTRY_NAME[code] ?? code,
    sourceCurrency: currency,
    destCountry: "Bolivia",
    destCurrency: "BOB",
    sourceAmount: t.sourceAmount.toFixed(2),
    providerFee: providerFee.toFixed(2),
    pollarFee: pollarFee.toFixed(2),
    totalSourceAmount: total.toFixed(2),
    usdcAmount: t.settlementAmount.toFixed(4),
    estimatedBobPayout: bob.toFixed(2),
    exchangeRate: perUsdc.toFixed(4),
    selectedRailId: providerId,
    railName: friendlyProviderName(providerId, corridor?.sourceRail ?? "", code),
    status: mapStatus(t.status),
    backendStatus: t.status,
    paymentReference: t.reference,
    recipientWalletAddress: t.recipientWalletAddress ?? t.pollarWallet ?? "GDQP2KPQGKIHYJGXNURG74YTI5FD5CJXNURG74YTI5FD5C",
    recipientName: t.recipientName ?? "Bolivia Remittance Recipient",
    paymentProofUrl: null as string | null,
    operatorNotes: t.history.length ? (t.history[t.history.length - 1].note ?? null) : null,
    pollarTxHash: t.pollarTxHash ?? null,
    stellarLedger: null as string | null,
    rateSource: "Sandbox quote (Express backend)",
    quoteExpiresAt: t.paymentExpiresAt ?? t.createdAt,
    paidAt: atOf(t, "PAYMENT_DETECTED"),
    verifiedAt: atOf(t, "PAYMENT_VERIFIED"),
    settledAt: atOf(t, "COMPLETED"),
    reconciled: t.status === "COMPLETED",
    reconciliationNotes: null as string | null,
    actualPaidAmount: ["PAYMENT_DETECTED", "PAYMENT_UNDER_REVIEW", "PAYMENT_VERIFIED", "COMPLETED"].includes(t.status)
      ? total.toFixed(2)
      : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    // Escape hatches the proxy handlers need for operator actions:
    backendTransferId: t.transferId,
    backendPaymentId: t.paymentId,
    backendCorridorId: t.corridorId,
    shareToken: t.shareToken,
    instructions: t.instructions ?? null,
    history: t.history,
  };
}

/** Public UI shape: keep status/amounts usable while removing private routing and payment data. */
export function backendTransferToPublicUi(t: BackendTransfer, corridors: BackendCorridor[]) {
  const ui = backendTransferToUi(t, corridors) as Record<string, unknown>;
  const privateFields = new Set([
    "trackingToken",
    "backendTransferId",
    "backendPaymentId",
    "backendCorridorId",
    "shareToken",
    "instructions",
    "history",
    "paymentProofUrl",
    "operatorNotes",
  ]);
  const safe = Object.fromEntries(Object.entries(ui).filter(([key]) => !privateFields.has(key)));
  return {
    ...safe,
    recipientName: "Bolivia Recipient",
    recipientWalletAddress: "G…",
    senderName: "African Local Sender",
    senderEmail: "",
  };
}

// UI provider ids (demo_ng_bank, sandbox_gh_momo, ...) -> backend corridor.
export function resolveBackendCorridor(
  corridors: BackendCorridor[],
  opts: { sourceCountry?: string; selectedRailId?: string },
): BackendCorridor {
  const norm = (s?: string) =>
    (s ?? "").toLowerCase().replace(/^(demo_|sandbox_|live_)/, "").replace(/_/g, "-");
  if (opts.selectedRailId) {
    const want = norm(opts.selectedRailId);
    const matches = corridors.filter(
      (c) => c.providerId.toLowerCase() === want || norm(c.providerId) === want,
    );
    const enabledMatch = matches.find((c) => c.enabled);
    if (enabledMatch) return enabledMatch;
    if (matches.length) {
      throw new Error(`Selected rail is not currently enabled: ${opts.selectedRailId}`);
    }
  }
  if (opts.sourceCountry) {
    const name = opts.sourceCountry.toLowerCase();
    const codeEntry = Object.entries(COUNTRY_NAME).find(([, n]) => n.toLowerCase() === name);
    const code = codeEntry?.[0] ?? opts.sourceCountry.toUpperCase().slice(0, 2);
    const inCountry = corridors.filter((c) => c.sourceCountry.toUpperCase() === code && c.enabled);
    if (inCountry.length) return inCountry[0];
    if (corridors.some((c) => c.sourceCountry.toUpperCase() === code)) {
      throw new Error(`No enabled corridor is currently available for ${opts.sourceCountry}`);
    }
  }
  const enabled = corridors.filter((c) => c.enabled);
  if (enabled.length) return enabled[0];
  throw new Error("No corridor available for this selection");
}

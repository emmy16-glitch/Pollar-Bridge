const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";
const OPERATOR_KEY = (import.meta.env.VITE_OPERATOR_KEY as string | undefined) ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(OPERATOR_KEY ? { "x-operator-key": OPERATOR_KEY } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Corridor {
  id: string;
  sourceCountry: string;
  sourceCurrency: string;
  sourceRail: string;
  mode: string;
  providerId: string;
  enabled: boolean;
  minimumAmount: number;
  maximumAmount: number;
}

export interface Quote {
  quoteId: string;
  sourceAmount: number;
  settlementAmount: number;
  exchangeRate: number;
  providerFee: number;
  platformFee: number;
  totalFees: number;
  amountDue: number;
  expiry: string;
  simulated: boolean;
}

export interface RailRec {
  corridorId: string;
  rail: string;
  provider: string;
  settlementAmount: number;
  totalFees: number;
  amountDue: number;
  eta: string;
  healthy: boolean;
  label: "cheapest" | "fastest" | "standard";
}

export interface Transfer {
  transferId: string;
  corridorId: string;
  quoteId: string;
  paymentId: string;
  reference: string;
  shareToken: string;
  status: string;
  sourceAmount: number;
  amountDue?: number;
  totalFees?: number;
  settlementAmount: number;
  instructions?: {
    accountName?: string;
    accountNumber?: string;
    paybill?: string;
    reference: string;
    amount: number;
    currency: string;
    note: string;
  };
  paymentExpiresAt?: string;
  pollarTxHash?: string;
  pollarWallet?: string;
  pollarMode?: "real" | "mock";
  history: { status: string; at: string; note?: string }[];
}

export interface Handoff {
  idempotencyKey: string;
  africanRail: { country: string; rail: string; provider: string; reference: string };
  pollar: { wallet: string; txHash: string; amountUsdc: number; env: string; mode: string };
  bolivia: { status: string; note: string; payoutRef: string };
}

export interface TrackView {
  reference: string;
  status: string;
  sourceAmount: number;
  settlementAmount: number;
  corridorId: string;
  pollarTxHash: string | null;
  timeline: { status: string; at: string; note?: string }[];
}

export function transferEventsUrl(id: string): string {
  return `${BASE}/transfers/${id}/events`;
}

export function shareUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}?track=${token}`;
}

export const api = {
  health: () => req<{ ok: boolean; pollarEnv: string }>("/health"),
  corridors: (enabledOnly = true) => req<Corridor[]>(`/corridors?enabledOnly=${enabledOnly}`),
  recommend: (country: string, amount: number) =>
    req<RailRec[]>(`/routes/recommend?country=${country}&amount=${amount}`),
  quote: (corridorId: string, sourceAmount: number) =>
    req<Quote>("/quotes", { method: "POST", body: JSON.stringify({ corridorId, sourceAmount }) }),
  createTransfer: (corridorId: string, sourceAmount: number, idempotencyKey?: string) =>
    req<Transfer>("/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ corridorId, sourceAmount, idempotencyKey }),
    }),
  getTransfer: (id: string) => req<Transfer>(`/transfers/${id}`),
  settle: (id: string) => req<Transfer>(`/transfers/${id}/settle`, { method: "POST" }),
  handoff: (id: string) => req<Handoff>(`/transfers/${id}/handoff`),
  track: (token: string) => req<TrackView>(`/track/${token}`),
  pending: () => req<Transfer[]>("/operator/pending"),
  opDetected: (pid: string) => req<Transfer>(`/operator/payments/${pid}/detected`, { method: "POST" }),
  opVerify: (pid: string) => req<Transfer>(`/operator/payments/${pid}/verify`, { method: "POST" }),
  opReject: (pid: string, reason: string) =>
    req<Transfer>(`/operator/payments/${pid}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  opRefund: (pid: string, reason: string) =>
    req<Transfer>(`/operator/payments/${pid}/refund`, { method: "POST", body: JSON.stringify({ reason }) }),
  audit: (limit = 50) => req<{ at: string; actor: string; action: string; target: string }[]>(`/operator/audit?limit=${limit}`),
  capabilities: () => req<unknown[]>("/capabilities"),
  providerHealth: () => req<unknown[]>("/providers/health"),
};

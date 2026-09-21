// Single place that knows where the Express backend lives.
// The Next.js UI keeps calling relative `/api/*` URLs; those route handlers
// below proxy to the backend so Postgres is NOT required at runtime.

export function backendBase(): string {
  const raw =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api";
  return raw.replace(/\/$/, "");
}

export function operatorKey(): string {
  return process.env.OPERATOR_API_KEY ?? "";
}

export async function backendFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const op = operatorKey();
  if (op && !headers["x-operator-key"] && !headers["X-Operator-Key"]) {
    headers["x-operator-key"] = op;
  }
  const res = await fetch(`${backendBase()}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `backend ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---------- Backend shapes (mirror src/types.ts in the Express backend) ----------

export interface BackendCorridor {
  id: string;
  sourceCountry: string;
  sourceCurrency: string;
  sourceRail: string;
  destinationCountry: string;
  settlementAsset: string;
  destinationAsset: string;
  mode: string;
  providerId: string;
  enabled: boolean;
  minimumAmount: number;
  maximumAmount: number;
}

export interface BackendProviderReg {
  countryCode: string;
  rail: string;
  mode: string;
  providerId: string;
}

export interface BackendTransfer {
  transferId: string;
  corridorId: string;
  quoteId: string;
  paymentId: string;
  reference: string;
  shareToken: string;
  recipientName?: string;
  recipientWalletAddress?: string;
  sourceAmount: number;
  totalRequired: number;
  amountDue?: number;
  totalFees?: number;
  settlementAmount: number;
  status: string;
  history: { status: string; at: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
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
  pollarMode?: string;
}

export interface BackendAudit {
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

export interface BackendHealthEntry {
  providerId: string;
  calls: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number;
  healthy: boolean;
}

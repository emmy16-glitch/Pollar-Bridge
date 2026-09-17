const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
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
}

export interface Transfer {
  transferId: string;
  corridorId: string;
  paymentId: string;
  reference: string;
  shareToken: string;
  status: string;
  sourceAmount: number;
  settlementAmount: number;
  pollarTxHash?: string;
  history: { status: string; at: string; note?: string }[];
}

export const api = {
  health: () => req<{ ok: boolean; pollarEnv: string }>("/health"),
  corridors: (enabledOnly = true) => req<Corridor[]>(`/corridors?enabledOnly=${enabledOnly}`),
  recommend: (country: string, amount: number) =>
    req<{ corridorId: string; rail: string; settlementAmount: number; label: string; eta: string }[]>(
      `/routes/recommend?country=${country}&amount=${amount}`,
    ),
  createTransfer: (corridorId: string, sourceAmount: number) =>
    req<Transfer>("/transfers", { method: "POST", body: JSON.stringify({ corridorId, sourceAmount }) }),
  getTransfer: (id: string) => req<Transfer>(`/transfers/${id}`),
  settle: (id: string) => req<Transfer>(`/transfers/${id}/settle`, { method: "POST" }),
  handoff: (id: string) => req<unknown>(`/transfers/${id}/handoff`),
  track: (token: string) => req<unknown>(`/track/${token}`),
  pending: () => req<Transfer[]>("/operator/pending"),
  opDetected: (pid: string) => req<Transfer>(`/operator/payments/${pid}/detected`, { method: "POST" }),
  opVerify: (pid: string) => req<Transfer>(`/operator/payments/${pid}/verify`, { method: "POST" }),
  opReject: (pid: string, reason: string) =>
    req<Transfer>(`/operator/payments/${pid}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  capabilities: () => req<unknown[]>("/capabilities"),
  providerHealth: () => req<unknown[]>("/providers/health"),
};

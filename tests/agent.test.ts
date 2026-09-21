import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { buildApp } from "../src/app.js";
import { buildContainer } from "../src/container.js";
import { setCorridorEnabled } from "../src/payments/corridors/corridorRegistry.js";

// The x402 machine rail is HTTP-semantic (402 -> 201), so these tests drive the
// real Express app on an ephemeral port instead of calling the service layer.
let server: Server;
let base = "";

beforeAll(async () => {
  const app = buildApp(buildContainer());
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const HEX = "ab".repeat(32);

describe("x402 agent rail", () => {
  it("answers a quote with HTTP 402 PAYMENT_REQUIRED and a payable memo", async () => {
    const res = await fetch(`${base}/agent/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridorId: "NG-NGN-BANK-BO-USDC", sourceAmount: 100000 }),
    });
    expect(res.status).toBe(402);
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe("PAYMENT_REQUIRED");
    expect(Number(body.priceUsdc)).toBeGreaterThan(0);
    expect(String(body.memo)).toMatch(/^PB-AGENT-[0-9A-F]{8}$/);
    expect(body.payTo).toBeTruthy();
    expect(body.network).toBe("stellar-testnet");
  });

  it("mints a real transfer (201) once the memo is redeemed with a payment hash", async () => {
    const q = await fetch(`${base}/agent/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridorId: "NG-NGN-BANK-BO-USDC", sourceAmount: 50000 }),
    });
    const { memo } = (await q.json()) as { memo: string };

    const res = await fetch(`${base}/agent/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo, paymentHash: HEX }),
    });
    expect(res.status).toBe(201);
    const t = (await res.json()) as Record<string, unknown>;
    expect(t.status).toBe("AWAITING_LOCAL_PAYMENT");
    expect(t.idempotencyKey).toBe(`agent_${memo}`);
    expect(t.sourceAmount).toBe(50000);
    // Honest labeling: the sandbox only checks hash shape.
    expect((t.payment as { verified: string }).verified).toBe("format-only-sandbox");
  });

  it("refuses a replayed memo (409) and a malformed hash (400)", async () => {
    const q = await fetch(`${base}/agent/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridorId: "NG-NGN-BANK-BO-USDC", sourceAmount: 10000 }),
    });
    const { memo } = (await q.json()) as { memo: string };
    const redeem = () =>
      fetch(`${base}/agent/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo, paymentHash: HEX }),
      });

    expect((await redeem()).status).toBe(201);
    expect((await redeem()).status).toBe(409);

    const bad = await fetch(`${base}/agent/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: "PB-AGENT-00000000", paymentHash: "not-hex" }),
    });
    expect(bad.status).toBe(400);
  });

  it("rejects an unknown memo (400) and reports status (404 / 200)", async () => {
    const unknown = await fetch(`${base}/agent/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: "PB-AGENT-DOESNOTEXIST", paymentHash: HEX }),
    });
    expect(unknown.status).toBe(400);
    expect((await fetch(`${base}/agent/status/PB-AGENT-DOESNOTEXIST`)).status).toBe(404);

    const q = await fetch(`${base}/agent/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridorId: "NG-NGN-BANK-BO-USDC", sourceAmount: 20000 }),
    });
    const { memo } = (await q.json()) as { memo: string };
    const st = await fetch(`${base}/agent/status/${memo}`);
    expect(st.status).toBe(200);
    expect(((await st.json()) as { redeemed: boolean }).redeemed).toBe(false);
  });

  it("does not burn a paid memo when transfer creation fails transiently", async () => {
    const q = await fetch(`${base}/agent/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridorId: "NG-NGN-BANK-BO-USDC", sourceAmount: 30000 }),
    });
    const { memo } = (await q.json()) as { memo: string };

    setCorridorEnabled("NG-NGN-BANK-BO-USDC", false);
    try {
      const failed = await fetch(`${base}/agent/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo, paymentHash: HEX }),
      });
      expect(failed.status).toBe(400);
    } finally {
      setCorridorEnabled("NG-NGN-BANK-BO-USDC", true);
    }

    const retry = await fetch(`${base}/agent/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo, paymentHash: HEX }),
    });
    expect(retry.status).toBe(201);
  });

  it("audits the machine action with actor=agent", async () => {
    const audit = await fetch(`${base}/operator/audit?limit=50`);
    const logs = (await audit.json()) as { actor: string; action: string }[];
    expect(logs.some((l) => l.actor === "agent" && l.action === "agent.transfer.create")).toBe(true);
  });
});
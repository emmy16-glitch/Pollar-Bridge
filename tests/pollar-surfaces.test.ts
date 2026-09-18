import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { buildApp } from "../src/app.js";
import { buildContainer } from "../src/container.js";

// Pollar surfaces must always answer, always label real-vs-sandbox, and never
// leak keys — with or without POLLAR_* env configured.
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

const SECRET_PATTERNS = [/sec_testnet_/, /sec_mainnet_/, /pub_testnet_/, /pub_mainnet_/, /x-pollar-api-key/];

describe("Pollar headless surfaces", () => {
  it("reports real-vs-sandbox status for every surface", async () => {
    const res = await fetch(`${base}/pollar/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(["real", "mock"]).toContain(body.mode);
    expect(["testnet", "live"]).toContain(body.env);
    expect(typeof body.deferredFunding).toBe("boolean");
  });

  it("ramps quote always answers and always carries a mode label", async () => {
    const res = await fetch(`${base}/ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(["real", "mock"]).toContain(body.mode);
    // Real mode returns quotes; sandbox mode returns a labeled estimate.
    expect(body.quotes ?? body.quote).toBeTruthy();
    if (body.mode === "mock") expect(String(body.note)).toMatch(/sandbox/i);
  });

  it("ramps quote rejects a bad query with 400", async () => {
    const res = await fetch(`${base}/ramps/quote?country=BO&amount=-5&currency=USDC`);
    expect(res.status).toBe(400);
  });

  it("earn opportunities answer for both Blend and DeFindex with a mode label", async () => {
    for (const provider of ["blend", "defindex"]) {
      const res = await fetch(`${base}/earn/opportunities?provider=${provider}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { mode: string; opportunities: unknown[] };
      expect(["real", "mock"]).toContain(body.mode);
      expect(Array.isArray(body.opportunities)).toBe(true);
    }
  });

  it("kyc providers answer per country with a mode label", async () => {
    for (const country of ["NG", "GH", "KE", "ZA"]) {
      const res = await fetch(`${base}/kyc/providers?country=${country}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { mode: string; providers: unknown[] };
      expect(["real", "mock"]).toContain(body.mode);
      expect(Array.isArray(body.providers)).toBe(true);
    }
  });

  it("user register validates input and returns a labeled mode", async () => {
    const ok = await fetch(`${base}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: "pilot-04-user" }),
    });
    expect(ok.status).toBe(201);
    const body = (await ok.json()) as { mode: string; user: { userId: string } };
    expect(["real", "mock"]).toContain(body.mode);
    expect(body.user.userId).toBeTruthy();

    const missing = await fetch(`${base}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missing.status).toBe(400);
  });

  it("never leaks Pollar credentials in any response body", async () => {
    const urls = [
      `${base}/pollar/status`,
      `${base}/ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp`,
      `${base}/earn/opportunities?provider=blend`,
      `${base}/kyc/providers?country=NG`,
      `${base}/health`,
    ];
    for (const url of urls) {
      const text = await (await fetch(url)).text();
      for (const pattern of SECRET_PATTERNS) {
        expect(pattern.test(text), `${url} leaked ${pattern}`).toBe(false);
      }
    }
  });
});
import { Router } from "express";
import { z } from "zod";
import type { Container } from "../container.js";
import { rateLimit } from "../security.js";
import {
  fetchEarnOpportunities,
  fetchKycProviders,
  fetchRampsQuoteReal,
  pollarEnv,
  pollarMode,
  registerPollarUser,
} from "../payments/pollar/pollarService.js";

// Public Pollar headless reads + user registration. No operatorAuth, no
// secret leakage (keys stay in backend env, never in responses).
export function pollerRoutes(c: Container): Router {
  const r = Router();

  // GET /ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp
  r.get("/ramps/quote", async (req, res) => {
    const country = String(req.query.country ?? "BO");
    const amount = Number(req.query.amount ?? 100);
    const currency = String(req.query.currency ?? "USDC");
    const direction = (String(req.query.direction ?? "offramp") === "onramp" ? "onramp" : "offramp") as
      | "onramp"
      | "offramp";
    if (!country || !Number.isFinite(amount) || amount <= 0 || !currency) {
      res.status(400).json({ error: "use ?country=BO&amount=100&currency=USDC&direction=offramp" });
      return;
    }
    try {
      const real = await fetchRampsQuoteReal(country, amount, currency, direction);
      if (real) {
        res.json({ mode: "real" as const, quotes: real.quotes });
        return;
      }
    } catch {
      // fall through to sandbox math
    }
    // Sandbox fallback: local QuoteService-style math, honestly labeled.
    // No Pollar key (or Pollar unreachable) — estimate 1:1 in USDC terms.
    const fee = Math.max(1, Math.round(amount * 0.015));
    res.json({
      mode: "mock" as const,
      note: "sandbox fallback — live Pollar quote unavailable",
      quote: { country, amount, currency, direction, fee, estimatedAmount: Math.round((amount - fee) * 100) / 100 },
    });
  });

  // GET /earn/opportunities?provider=blend
  r.get("/earn/opportunities", async (req, res) => {
    const raw = String(req.query.provider ?? "blend");
    const provider = (raw === "defindex" ? "defindex" : "blend") as "blend" | "defindex";
    try {
      const result = await fetchEarnOpportunities(provider);
      if (result.mode === "real") {
        res.json({ mode: "real" as const, opportunities: result.opportunities });
        return;
      }
    } catch {
      // fall through to sandbox demos
    }
    void c;
    res.json({
      mode: "mock" as const,
      note: "sandbox fallback — demo opportunities, not real yield",
      opportunities: [
        { id: `sandbox-${provider}-usdc`, provider, asset: "USDC", apy: "5.2% (sandbox)", note: "demo — not real yield" },
        { id: `sandbox-${provider}-xlm`, provider, asset: "XLM", apy: "3.1% (sandbox)", note: "demo — not real yield" },
      ],
    });
  });

  // GET /kyc/providers?country=NG
  r.get("/kyc/providers", async (req, res) => {
    const country = String(req.query.country ?? "NG");
    if (!country) {
      res.status(400).json({ error: "use ?country=NG" });
      return;
    }
    try {
      const result = await fetchKycProviders(country);
      if (result.mode === "real") {
        res.json({ mode: "real" as const, providers: result.providers });
        return;
      }
    } catch {
      // fall through to sandbox provider
    }
    res.json({
      mode: "mock" as const,
      note: "sandbox fallback — operator verifies manually",
      providers: [{ id: "sandbox-kyc", name: "Sandbox KYC (operator verify)", levels: ["basic"] }],
    });
  });

  // POST /users/register {externalId, email?}
  const registerSchema = z.object({
    externalId: z.string().min(1).max(120),
    email: z.string().email().optional(),
  });
  r.post("/users/register", rateLimit(60), async (req, res) => {
    try {
      const body = registerSchema.parse(req.body);
      const result = await registerPollarUser(body.externalId, body.email);
      c.audit.record("api", "pollar.user.register", body.externalId, result.mode);
      res.status(201).json({ mode: result.mode, user: { userId: result.userId, externalId: body.externalId } });
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  });

  // GET /pollar/status
  r.get("/pollar/status", (_req, res) => {
    res.json({
      mode: pollarMode(),
      env: pollarEnv(),
      deferredFunding: Boolean(process.env.POLLAR_SECRET_KEY),
      ramps: "live-quote-or-sandbox",
      earn: "live-or-sandbox",
      kyc: "live-or-sandbox",
    });
  });

  return r;
}

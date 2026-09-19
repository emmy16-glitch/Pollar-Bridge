import { Router } from "express";
import type { Container } from "../container.js";
import { seedDemoData } from "../seed.js";
import { operatorAuth, rateLimit } from "../security.js";

// Demo data on demand: POST /api/demo/seed populates the store with labeled
// demo transfers when the instance booted empty (or after a cold start wiped
// it). Idempotent — re-running returns the existing demo records.
export function demoRoutes(c: Container): Router {
  const r = Router();
  r.post("/demo/seed", operatorAuth, rateLimit(30), async (_req, res) => {
    try {
      const result = await seedDemoData(c);
      c.audit.record("api", "demo.seed", result.seeded ? "created" : "already-present", result.transferIds.join(","));
      res.status(result.seeded ? 201 : 200).json(result);
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : "demo seed failed" });
    }
  });
  return r;
}

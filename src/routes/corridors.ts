import { Router } from "express";
import { getCorridor, listCorridors, setCorridorEnabled } from "../payments/corridors/corridorRegistry.js";
import { listCountries } from "../payments/countries/countryRegistry.js";
import { buildCapabilityMatrix } from "../payments/providers/capabilityMatrix.js";
import type { Container } from "../container.js";
import { operatorAuth, rateLimit } from "../security.js";

export function corridorRoutes(c: Container): Router {
  const r = Router();
  r.get("/countries", (_req, res) => res.json(listCountries()));
  r.get("/corridors", (req, res) => {
    res.json(listCorridors(req.query.enabledOnly === "true"));
  });
  r.get("/corridors/:id", (req, res) => {
    try {
      res.json(getCorridor(req.params.id));
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });
  // Spec §23.3 corridor administration: disable without deleting history.
  // Admin write: operator-gated so anyone can't kill a live route.
  r.patch("/corridors/:id", operatorAuth, rateLimit(60), (req, res) => {
    try {
      const enabled = (req.body as { enabled?: boolean })?.enabled;
      if (typeof enabled !== "boolean") {
        res.status(400).json({ error: "body.enabled must be boolean" });
        return;
      }
      const updated = setCorridorEnabled(req.params.id, enabled);
      c.audit.record("operator", enabled ? "corridor.enable" : "corridor.disable", req.params.id);
      res.json(updated);
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });
  r.get("/capabilities", (_req, res) => res.json(buildCapabilityMatrix(c.registry)));
  r.get("/providers", (_req, res) => res.json(c.registry.list()));
  // Spec §23.4 provider health view.
  r.get("/providers/health", (_req, res) => {
    const ids = c.registry.list().map((p) => p.providerId);
    res.json(c.health.snapshot(ids));
  });
  return r;
}

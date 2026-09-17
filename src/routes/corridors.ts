import { Router } from "express";
import { listCorridors } from "../payments/corridors/corridorRegistry.js";
import { listCountries } from "../payments/countries/countryRegistry.js";
import { buildCapabilityMatrix } from "../payments/providers/capabilityMatrix.js";
import type { Container } from "../container.js";

export function corridorRoutes(c: Container): Router {
  const r = Router();
  r.get("/countries", (_req, res) => res.json(listCountries()));
  r.get("/corridors", (req, res) => {
    res.json(listCorridors(req.query.enabledOnly === "true"));
  });
  r.get("/capabilities", (_req, res) => res.json(buildCapabilityMatrix(c.registry)));
  r.get("/providers", (_req, res) => res.json(c.registry.list()));
  return r;
}

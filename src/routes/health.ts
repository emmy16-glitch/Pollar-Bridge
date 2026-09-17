import { Router } from "express";
import { pollarEnv } from "../payments/pollar/pollarService.js";

export function healthRoutes(): Router {
  const r = Router();
  r.get("/health", (_req, res) =>
    res.json({ ok: true, service: "pollar-bridge-backend", pollarEnv: pollarEnv(), time: new Date().toISOString() }),
  );
  return r;
}

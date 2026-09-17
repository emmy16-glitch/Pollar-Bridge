import { Router } from "express";
import type { Container } from "../container.js";

// Operator dashboard (sandbox): simulate detection, verify, reject.
export function operatorRoutes(c: Container): Router {
  const r = Router();

  r.post("/operator/payments/:paymentId/detected", (req, res) => {
    try {
      // poke sandbox adapters so their internal status matches
      for (const a of [c.sandboxBank, c.sandboxMomo, c.sandboxP2p]) {
        try {
          (a as unknown as { simulateIncomingPayment: (id: string) => void }).simulateIncomingPayment(req.params.paymentId);
        } catch { /* not this adapter */ }
      }
      res.json(c.transfers.markDetected(req.params.paymentId));
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  r.post("/operator/payments/:paymentId/verify", async (req, res) => {
    try {
      res.json(await c.transfers.verifyPayment(req.params.paymentId, "operator"));
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "verify failed" });
    }
  });

  r.post("/operator/payments/:paymentId/reject", (req, res) => {
    try {
      const reason = typeof req.body?.reason === "string" ? req.body.reason : "operator rejected";
      res.json(c.transfers.rejectPayment(req.params.paymentId, reason));
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "reject failed" });
    }
  });

  return r;
}

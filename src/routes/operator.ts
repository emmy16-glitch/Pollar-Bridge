import { Router } from "express";
import type { Container } from "../container.js";

const PENDING: string[] = ["AWAITING_LOCAL_PAYMENT", "PAYMENT_DETECTED", "PAYMENT_UNDER_REVIEW"];

// Operator dashboard API (spec §23.2): pending queue, verify/reject/refund, audit.
export function operatorRoutes(c: Container): Router {
  const r = Router();

  r.get("/operator/pending", (_req, res) => {
    res.json(c.transfers.list().filter((t) => PENDING.includes(t.status)));
  });

  r.get("/operator/audit", (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    res.json(c.audit.list(limit));
  });

  r.post("/operator/payments/:paymentId/detected", (req, res) => {
    try {
      for (const a of [c.sandboxBank, c.sandboxMomo, c.sandboxP2p, c.sandboxAgent]) {
        try {
          (a as unknown as { simulateIncomingPayment: (id: string) => void }).simulateIncomingPayment(req.params.paymentId);
        } catch { /* not this adapter */ }
      }
      const t = c.transfers.markDetected(req.params.paymentId);
      c.audit.record("operator", "payment.detected", req.params.paymentId);
      res.json(t);
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  r.post("/operator/payments/:paymentId/verify", async (req, res) => {
    const started = Date.now();
    try {
      const t = await c.transfers.verifyPayment(req.params.paymentId, "operator");
      c.health.record(t.corridorId, Date.now() - started, true);
      c.audit.record("operator", "payment.verify", req.params.paymentId, t.transferId);
      res.json(t);
    } catch (e: unknown) {
      c.health.record("unknown", Date.now() - started, false);
      res.status(400).json({ error: e instanceof Error ? e.message : "verify failed" });
    }
  });

  r.post("/operator/payments/:paymentId/reject", (req, res) => {
    try {
      const reason = typeof req.body?.reason === "string" ? req.body.reason : "operator rejected";
      const t = c.transfers.rejectPayment(req.params.paymentId, reason);
      c.audit.record("operator", "payment.reject", req.params.paymentId, reason);
      res.json(t);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "reject failed" });
    }
  });

  r.post("/operator/payments/:paymentId/refund", async (req, res) => {
    try {
      const reason = typeof req.body?.reason === "string" ? req.body.reason : "operator refund";
      const t = await c.transfers.refundPayment(req.params.paymentId, reason);
      c.audit.record("operator", "payment.refund", req.params.paymentId, reason);
      res.json(t);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "refund failed" });
    }
  });

  return r;
}

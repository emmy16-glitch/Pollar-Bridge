import { Router } from "express";
import type { Container } from "../container.js";
import { operatorAuth, rateLimit } from "../security.js";

const PENDING: string[] = ["AWAITING_LOCAL_PAYMENT", "PAYMENT_DETECTED", "PAYMENT_UNDER_REVIEW"];

// Operator dashboard API (spec §23.2): pending queue, verify/reject/refund, audit.
// Money-moving POSTs require x-operator-key when OPERATOR_API_KEY is set;
// reads (pending/audit) stay open for the demo cockpit.
export function operatorRoutes(c: Container): Router {
  const r = Router();

  r.get("/operator/transfers", operatorAuth, (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
    res.json(c.transfers.list(limit, offset));
  });

  r.get("/operator/transfers/:id", operatorAuth, (req, res) => {
    try {
      res.json(c.transfers.get(req.params.id));
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  r.get("/operator/pending", (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 200);
    res.json(c.transfers.list(limit, 0).filter((t) => PENDING.includes(t.status)));
  });

  r.get("/operator/audit", (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    res.json(c.audit.list(limit));
  });

  const guard = [operatorAuth, rateLimit(120)];

  // Simulate the user paying on ANY registered adapter (not just the first 4).
  // Iterates the full registry and calls simulateIncomingPayment where present.
  r.post("/operator/payments/:paymentId/detected", ...guard, (req, res) => {
    try {
      const pid = req.params.paymentId;
      const resolved = c.transfers.get(pid);
      const actualPid = resolved.paymentId || pid;
      let simulated = false;
      for (const reg of c.registry.list()) {
        try {
          const adapter = c.registry.resolveById(reg.providerId) as unknown as {
            simulateIncomingPayment?: (id: string) => void;
          };
          if (typeof adapter.simulateIncomingPayment === "function") {
            try {
              adapter.simulateIncomingPayment(actualPid);
              simulated = true;
            } catch {
              // not this adapter's payment — try next
            }
          }
        } catch {
          // unresolvable — skip
        }
      }
      const t = c.transfers.markDetected(actualPid);
      c.audit.record("operator", "payment.detected", pid, simulated ? "simulated" : "already-detected");
      res.json(t);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "not found";
      const code = /expired/i.test(msg) ? 410 : /cannot mark/i.test(msg) ? 409 : 404;
      res.status(code).json({ error: msg });
    }
  });

  r.post("/operator/payments/:paymentId/verify", ...guard, async (req, res) => {
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

  r.post("/operator/payments/:paymentId/reject", ...guard, (req, res) => {
    try {
      const raw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      const reason = raw.length > 0 ? raw : "operator rejected";
      const t = c.transfers.rejectPayment(req.params.paymentId, reason);
      c.audit.record("operator", "payment.reject", req.params.paymentId, reason);
      res.json(t);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "reject failed" });
    }
  });

  r.post("/operator/payments/:paymentId/refund", ...guard, async (req, res) => {
    try {
      const raw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      const reason = raw.length > 0 ? raw : "operator refund";
      const t = await c.transfers.refundPayment(req.params.paymentId, reason);
      c.audit.record("operator", "payment.refund", req.params.paymentId, reason);
      res.json(t);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "refund failed" });
    }
  });

  return r;
}

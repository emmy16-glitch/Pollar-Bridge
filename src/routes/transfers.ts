import { Router } from "express";
import { z } from "zod";
import type { Container } from "../container.js";
import { reconcile } from "../payments/orchestration/reconciliation.js";

const createSchema = z.object({
  corridorId: z.string().min(3),
  sourceAmount: z.number().positive(),
  senderName: z.string().optional(),
});

export function transferRoutes(c: Container): Router {
  const r = Router();

  // 1. select corridor + amount -> transfer (QUOTE_CREATED)
  r.post("/transfers", async (req, res) => {
    try {
      const body = createSchema.parse(req.body);
      const t = c.transfers.createTransfer(body.corridorId, body.sourceAmount, body.senderName);
      await c.transfers.issuePaymentInstructions(t.transferId);
      res.status(201).json(c.transfers.get(t.transferId));
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  });

  r.get("/transfers", (_req, res) => res.json(c.transfers.list()));
  r.get("/transfers/:id", (req, res) => {
    try {
      res.json(c.transfers.get(req.params.id));
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  // 2. after local payment verified -> settle (operator or auto calls verify first)
  r.post("/transfers/:id/settle", async (req, res) => {
    try {
      const t = await c.transfers.settleToPollar(req.params.id);
      res.json(t);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "settle failed" });
    }
  });

  r.get("/transfers/:id/reconciliation", (req, res) => {
    try {
      const t = c.transfers.get(req.params.id);
      const rec = reconcile(t, {
        receivedLocalAmount: t.totalRequired,
        creditedUsdcAmount: t.status === "COMPLETED" ? t.settlementAmount : undefined,
        localPaymentStatus: t.status === "COMPLETED" || t.status === "PAYMENT_VERIFIED" ? "verified" : t.status,
        settlementStatus: t.status === "COMPLETED" ? "settled" : "pending",
      });
      res.json(rec);
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  return r;
}

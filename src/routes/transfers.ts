import { Router } from "express";
import { z } from "zod";
import type { Container } from "../container.js";
import type { Transfer } from "../types.js";
import { getCorridor } from "../payments/corridors/corridorRegistry.js";
import { reconcile } from "../payments/orchestration/reconciliation.js";
import { operatorAuth, rateLimit } from "../security.js";
import { transferEvents } from "../store/transferEvents.js";
import { TERMINAL_STATUSES } from "../payments/orchestration/stateMachine.js";

const createSchema = z.object({
  corridorId: z.string().min(3),
  sourceAmount: z.number().finite().positive(),
  senderName: z.string().max(120).optional(),
  recipientName: z.string().max(120).optional(),
  recipientWalletAddress: z.string().max(120).optional(),
  idempotencyKey: z.string().max(120).optional(),
});

function publicTransfer(t: Transfer) {
  return {
    reference: t.reference,
    corridorId: t.corridorId,
    sourceAmount: t.sourceAmount,
    totalRequired: t.totalRequired,
    amountDue: t.amountDue,
    settlementAmount: t.settlementAmount,
    status: t.status,
    timeline: t.history,
    pollarTxHash: t.pollarTxHash ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function transferRoutes(c: Container): Router {
  const r = Router();

  // 1. select corridor + amount -> transfer (QUOTE_CREATED + instructions)
  r.post("/transfers", rateLimit(120), async (req, res) => {
    try {
      const body = createSchema.parse(req.body);
      const key =
        (req.header("Idempotency-Key") ?? body.idempotencyKey ?? "").trim() || undefined;
      const t = c.transfers.createTransfer(
        body.corridorId,
        body.sourceAmount,
        body.senderName,
        key,
        body.recipientName,
        body.recipientWalletAddress,
      );
      await c.transfers.issuePaymentInstructions(t.transferId);
      c.audit.record("api", "transfer.create", t.transferId, t.reference);
      res.status(key ? 201 : 201).json(c.transfers.get(t.transferId));
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  });

  r.get("/transfers", (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
    res.json(c.transfers.list(limit, offset).map(publicTransfer));
  });
  r.get("/transfers/:id", (req, res) => {
    try {
      res.json(publicTransfer(c.transfers.get(req.params.id)));
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  // Live timeline: SSE stream of status changes for one transfer.
  // Frontend uses this instead of 3s polling; stops on terminal states.
  r.get("/transfers/:id/events", (req, res) => {
    try {
      const t = c.transfers.get(req.params.id);
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
      send(publicTransfer(t));
      if (TERMINAL_STATUSES.includes(t.status)) {
        res.end();
        return;
      }
      // Subscribe to this transfer's own channel (emitTransfer already emits
      // `transfer:<id>` alongside the global event). The old code listened on
      // the global "transfer" bus, waking EVERY open SSE stream on EVERY
      // transfer update — O(streams) work per emit plus a retained closure
      // per stream on a shared emitter.
      const channel = `transfer:${req.params.id}`;
      const onUpdate = () => {
        try {
          const cur = c.transfers.get(req.params.id);
          send(publicTransfer(cur));
          if (TERMINAL_STATUSES.includes(cur.status)) {
            transferEvents.removeListener(channel, onUpdate);
            res.end();
          }
        } catch {
          // transfer deleted mid-stream
        }
      };
      transferEvents.on(channel, onUpdate);
      req.on("close", () => transferEvents.removeListener(channel, onUpdate));
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  // 2. after local payment verified -> settle (operator or auto calls verify first).
  // Money-moving: operator-gated + rate-limited when OPERATOR_API_KEY is set.
  r.post("/transfers/:id/settle", operatorAuth, rateLimit(60), async (req, res) => {
    try {
      const t = await c.transfers.settleToPollar(req.params.id);
      c.audit.record("system", "transfer.settle", req.params.id, t.pollarTxHash);
      res.json(t);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "settle failed" });
    }
  });

  r.get("/transfers/:id/reconciliation", async (req, res) => {
    try {
      const t = c.transfers.get(req.params.id);
      const corridor = getCorridor(t.corridorId);
      // Real provider actuals (not echo of expected): amount comes from the
      // adapter's stored payment record.
      let receivedLocalAmount: number | undefined;
      let localPaymentStatus: string = t.status;
      try {
        const adapter = c.registry.resolve(corridor.sourceCountry, corridor.sourceRail, corridor.mode);
        if (t.paymentId) {
          const ps = await adapter.getPaymentStatus(t.paymentId);
          const raw = ps.raw as { amount?: number } | undefined;
          if (typeof raw?.amount === "number") receivedLocalAmount = raw.amount;
          localPaymentStatus =
            ps.status === "verified" || t.status === "PAYMENT_VERIFIED" || t.status === "COMPLETED"
              ? "verified"
              : ps.status;
        }
      } catch {
        // adapter has no record (e.g. restarted sandbox) — fall back to transfer state
      }
      const rec = reconcile(t, {
        receivedLocalAmount,
        creditedUsdcAmount: t.status === "COMPLETED" ? t.settlementAmount : undefined,
        localPaymentStatus,
        settlementStatus: t.status === "COMPLETED" ? "settled" : "pending",
      });
      res.json(rec);
    } catch (e: unknown) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  });

  return r;
}

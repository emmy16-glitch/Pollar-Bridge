import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Container } from "../container.js";
import { rateLimit } from "../security.js";

// x402-style machine rail. Machines quote first (402), pay testnet USDC with
// the memo, then present the payment hash to mint a real local transfer.
//
// In-memory quote cache keyed by memo. Exported for tests.
export interface AgentQuote {
  corridorId: string;
  sourceAmount: number;
  priceUsdc: number;
  expiresAt: string;
  redeemed: boolean;
}

export const __agentQuotes = new Map<string, AgentQuote>();

const quoteSchema = z.object({
  corridorId: z.string().min(3),
  sourceAmount: z.number().positive(),
});

const transferSchema = z.object({
  memo: z.string().min(3).max(120),
  paymentHash: z.string().regex(/^[0-9a-fA-F]{64}$/, "paymentHash must be 64 hex chars"),
  senderName: z.string().max(120).optional(),
});

function isExpired(q: AgentQuote): boolean {
  return Date.now() > new Date(q.expiresAt).getTime();
}

export function agentRoutes(c: Container): Router {
  const r = Router();

  // POST /agent/quote — 402 when no x-payment-hash header (quote-first flow).
  r.post("/agent/quote", async (req, res) => {
    try {
      const body = quoteSchema.parse(req.body);
      // Compute only (do NOT save the quote): validates corridor + limits.
      const quote = c.quotes.createQuote(body);
      const priceUsdc = quote.settlementAmount;
      const payTo = process.env.AGENT_SETTLE_WALLET || "G-AGENT-ESCROW-sandbox";
      const memo = `PB-AGENT-${randomBytes(4).toString("hex").toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      __agentQuotes.set(memo, {
        corridorId: body.corridorId,
        sourceAmount: body.sourceAmount,
        priceUsdc,
        expiresAt,
        redeemed: false,
      });
      const payload = {
        code: "PAYMENT_REQUIRED",
        priceUsdc,
        currency: "USDC",
        network: "stellar-testnet",
        payTo,
        memo,
        expiresAt,
        instructions: "send testnet USDC to payTo with memo, then POST /api/agent/transfers with {memo, paymentHash}",
      };
      // 402 (not 200!) when the caller has not presented payment yet.
      if (!req.header("x-payment-hash")) {
        res.status(402).json(payload);
        return;
      }
      res.status(200).json({ ...payload, presented: req.header("x-payment-hash") });
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  });

  // POST /agent/transfers — redeem a quoted memo with a payment hash.
  r.post("/agent/transfers", rateLimit(60), async (req, res) => {
    try {
      const body = transferSchema.parse(req.body);
      const q = __agentQuotes.get(body.memo);
      if (!q) {
        res.status(400).json({ error: "unknown memo — POST /api/agent/quote first" });
        return;
      }
      if (isExpired(q)) {
        res.status(410).json({ error: "quote expired — request a fresh /api/agent/quote" });
        return;
      }
      if (q.redeemed) {
        res.status(409).json({ error: "memo already redeemed" });
        return;
      }
      q.redeemed = true;
      __agentQuotes.set(body.memo, q);
      const t = c.transfers.createTransfer(
        q.corridorId,
        q.sourceAmount,
        body.senderName ?? "x402-agent",
        `agent_${body.memo}`,
      );
      await c.transfers.issuePaymentInstructions(t.transferId);
      c.audit.record("agent", "agent.transfer.create", t.transferId, body.memo);
      const full = c.transfers.get(t.transferId);
      res.status(201).json({
        ...full,
        payment: {
          verified: "format-only-sandbox",
          note: "mainnet verifies on Horizon",
          paymentHash: body.paymentHash,
        },
      });
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  });

  // GET /agent/status/:memo
  r.get("/agent/status/:memo", (req, res) => {
    const q = __agentQuotes.get(req.params.memo);
    if (!q) {
      res.status(404).json({ error: "unknown memo" });
      return;
    }
    res.json({
      redeemed: q.redeemed,
      expired: isExpired(q),
      quote: { corridorId: q.corridorId, sourceAmount: q.sourceAmount, priceUsdc: q.priceUsdc, expiresAt: q.expiresAt },
    });
  });

  return r;
}

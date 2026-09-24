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

// Bound temporary memory: memos carry a 15-min TTL; prune expired entries
// (with a retention grace for status queries) and cap the map so the cache
// cannot grow without bound.
const MAX_AGENT_QUOTES = 1000;
// Keep expired memos 1h for GET /agent/status/:memo, then evict.
const AGENT_QUOTE_RETENTION_MS = 60 * 60 * 1000;

export function pruneAgentQuotes(now = Date.now()): number {
  let removed = 0;
  for (const [memo, q] of __agentQuotes) {
    if (now - new Date(q.expiresAt).getTime() > AGENT_QUOTE_RETENTION_MS - 15 * 60 * 1000) {
      __agentQuotes.delete(memo);
      removed += 1;
    }
  }
  while (__agentQuotes.size > MAX_AGENT_QUOTES) {
    const oldest = __agentQuotes.keys().next();
    if (oldest.done) break;
    __agentQuotes.delete(oldest.value);
    removed += 1;
  }
  return removed;
}

const quoteSchema = z.object({
  corridorId: z.string().min(3),
  sourceAmount: z.number().finite().positive(),
});

const transferSchema = z.object({
  memo: z.string().min(3).max(120),
  paymentHash: z.string().regex(/^[0-9a-fA-F]{64}$/, "paymentHash must be 64 hex chars"),
  senderName: z.string().max(120).optional(),
});

function isExpired(q: AgentQuote): boolean {
  return Date.now() > new Date(q.expiresAt).getTime();
}

function onChainVerificationEnabled(): boolean {
  return process.env.AGENT_VERIFY_ONCHAIN === "true";
}

function settlementWallet(): string {
  return process.env.AGENT_SETTLE_WALLET || "G-AGENT-ESCROW-sandbox";
}

type PaymentProof =
  | { verified: "format-only-sandbox"; note: string; paymentHash: string }
  | { verified: "onchain"; note: string; paymentHash: string; ledger?: number };

async function verifyPaymentProof(
  quote: AgentQuote,
  memo: string,
  paymentHash: string,
): Promise<{ ok: true; proof: PaymentProof } | { ok: false; reason: string }> {
  if (!onChainVerificationEnabled()) {
    return {
      ok: true,
      proof: {
        verified: "format-only-sandbox",
        note: "Sandbox mode: hash shape checked only. Set AGENT_VERIFY_ONCHAIN=true to require Horizon proof.",
        paymentHash,
      },
    };
  }

  const payTo = settlementWallet();
  if (!/^G[A-Z2-7]{55}$/.test(payTo)) {
    return { ok: false, reason: "AGENT_SETTLE_WALLET must be a valid Stellar G-address when on-chain verification is enabled" };
  }

  const horizon = (process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org").replace(/\/$/, "");
  try {
    const txRes = await fetch(`${horizon}/transactions/${paymentHash}`);
    if (!txRes.ok) return { ok: false, reason: "transaction hash was not found on Stellar testnet" };
    const tx = (await txRes.json()) as { successful?: boolean; memo?: string; ledger?: number };
    if (!tx.successful) return { ok: false, reason: "Stellar transaction is not successful" };
    if (tx.memo !== memo) return { ok: false, reason: "Stellar transaction memo does not match the quoted memo" };

    const opsRes = await fetch(`${horizon}/transactions/${paymentHash}/operations?limit=200`);
    if (!opsRes.ok) return { ok: false, reason: "could not read Stellar payment operations" };
    const opsBody = (await opsRes.json()) as {
      _embedded?: { records?: Array<Record<string, unknown>> };
    };
    const issuer = process.env.AGENT_USDC_ISSUER;
    const matched = (opsBody._embedded?.records ?? []).some((op) => {
      if (op.type !== "payment" || op.to !== payTo || op.asset_code !== "USDC") return false;
      if (issuer && op.asset_issuer !== issuer) return false;
      const amount = Number(op.amount);
      return Number.isFinite(amount) && amount + 1e-7 >= quote.priceUsdc;
    });
    if (!matched) {
      return { ok: false, reason: "no matching USDC payment to the configured settlement wallet was found" };
    }

    return {
      ok: true,
      proof: {
        verified: "onchain",
        note: "Verified against Stellar Horizon: successful transaction, matching memo, destination, asset and amount.",
        paymentHash,
        ledger: tx.ledger,
      },
    };
  } catch {
    return { ok: false, reason: "Stellar Horizon could not verify the payment proof" };
  }
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
      const payTo = settlementWallet();
      if (onChainVerificationEnabled() && !/^G[A-Z2-7]{55}$/.test(payTo)) {
        res.status(503).json({ error: "agent rail misconfigured: valid AGENT_SETTLE_WALLET required" });
        return;
      }
      const memo = `PB-AGENT-${randomBytes(4).toString("hex").toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      pruneAgentQuotes();
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
      const verification = await verifyPaymentProof(q, body.memo, body.paymentHash);
      if (!verification.ok) {
        res.status(402).json({ error: "payment proof not verified", reason: verification.reason });
        return;
      }

      const t = c.transfers.createTransfer(
        q.corridorId,
        q.sourceAmount,
        body.senderName ?? "x402-agent",
        `agent_${body.memo}`,
      );
      await c.transfers.issuePaymentInstructions(t.transferId);
      // Only consume the memo after the transfer is fully created. If a
      // provider/corridor fails transiently, the paid quote remains retryable.
      q.redeemed = true;
      __agentQuotes.set(body.memo, q);
      c.audit.record("agent", "agent.transfer.create", t.transferId, body.memo);
      const full = c.transfers.get(t.transferId);
      res.status(201).json({
        ...full,
        payment: verification.proof,
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

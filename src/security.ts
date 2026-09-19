import type { NextFunction, Request, Response } from "express";

// Security semantics (single source of truth):
// - Public: health, countries, corridors, capabilities, quotes, recommend,
//   transfer create/get/track/handoff, SSE, webhooks (HMAC in live).
// - Operator (money-moving): verify/reject/refund/detected, settle,
//   corridor admin. Gated by OPERATOR_API_KEY when set.
// - Secrets (POLLAR_SECRET_KEY, WEBHOOK_SECRET, *_API_KEY) live in backend
//   env only, never in web/, logs, or error responses.

export function operatorKeyConfigured(): boolean {
  return Boolean(process.env.OPERATOR_API_KEY);
}

/** Gate money-moving routes. Open in sandbox-demo when unset (with warning header). */
export function operatorAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.OPERATOR_API_KEY ?? "";
  if (!expected) {
    res.setHeader("X-Operator-Auth", "disabled-demo-mode");
    next();
    return;
  }
  const got = req.header("x-operator-key") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (got && got === expected) {
    next();
    return;
  }
  res.status(401).json({ error: "operator auth required (x-operator-key)" });
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound temporary memory: stale buckets are swept so distinct IP+route keys
// (including spoofed/forged IPs behind proxies) cannot grow the map forever.
const MAX_BUCKETS = 5000;

function sweepBuckets(now: number): void {
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
  // Still over cap (burst of distinct keys within one window): evict oldest
  // insertion-first until bounded. Correctness impact is only a looser limit.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

/** Test hook: drop all rate-limit state. */
export function __clearRateLimitBuckets(): void {
  buckets.clear();
}

/** Test hook: current bucket count (assert bounded growth). */
export function __rateLimitBucketCount(): number {
  return buckets.size;
}

/** Tiny in-memory rate limiter (no deps). Per-IP + route sliding window. */
export function rateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip ?? "unknown"}:${req.path}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now > b.resetAt) {
      if (b) buckets.delete(key);
      else if (buckets.size >= MAX_BUCKETS) sweepBuckets(now);
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      while (buckets.size > MAX_BUCKETS) {
        const oldest = buckets.keys().next();
        if (oldest.done) break;
        if (oldest.value === key) break; // never evict the just-created bucket
        buckets.delete(oldest.value);
      }
      next();
      return;
    }
    b.count += 1;
    if (b.count > maxPerMinute) {
      res.setHeader("Retry-After", String(Math.ceil((b.resetAt - now) / 1000)));
      res.status(429).json({ error: "rate limited — retry shortly" });
      return;
    }
    next();
  };
}

/** Redact secrets from any string before logging. */
export function redactSecrets(s: string): string {
  return s
    .replace(/(sec_testnet_[A-Za-z0-9_-]+|sec_mainnet_[A-Za-z0-9_-]+|pub_testnet_[A-Za-z0-9_-]+|pub_mainnet_[A-Za-z0-9_-]+)/g, "[redacted-key]")
    .replace(/("?(?:api[_-]?key|secret|token|authorization)"?\s*[:=]\s*"?)[^",\s}]+/gi, "$1[redacted]");
}

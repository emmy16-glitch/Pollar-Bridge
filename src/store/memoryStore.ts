import type { Quote, Transfer } from "../types.js";

// Phase 1 in-memory store. Swap for a real DB in Phase 3 without
// changing orchestration (same interface).
//
// Bounded temporary memory: quotes expire (10-min TTL + grace), transfers are
// retained for a fixed window, and all maps are capped so a long-running
// process or warm serverless instance cannot grow without bound.
const MAX_QUOTES = 1000;
// Quotes live 10 min (see QuoteService); keep 60 min so status/retry reads
// and linked transfers still resolve, then evict.
const QUOTE_RETENTION_MS = 60 * 60 * 1000;
const MAX_TRANSFERS = 2000;
// Retain transfers 24h for tracking/reconciliation, then evict.
const TRANSFER_RETENTION_MS = 24 * 60 * 60 * 1000;

function createdMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

export class MemoryStore {
  quotes = new Map<string, Quote>();
  transfers = new Map<string, Transfer>();
  paymentToTransfer = new Map<string, string>();
  idempotencyToTransfer = new Map<string, string>();
  // Reverse index so re-indexing a transfer is O(1) instead of scanning
  // the whole paymentToTransfer map on every save.
  private transferPayment = new Map<string, string>();

  saveQuote(q: Quote): void {
    this.pruneQuotes();
    this.quotes.set(q.quoteId, q);
    // Cap: evict oldest (insertion order) beyond MAX_QUOTES.
    while (this.quotes.size > MAX_QUOTES) {
      const oldest = this.quotes.keys().next();
      if (oldest.done) break;
      this.quotes.delete(oldest.value);
    }
  }
  getQuote(id: string): Quote {
    const q = this.quotes.get(id);
    if (!q) throw new Error(`Unknown quote: ${id}`);
    return q;
  }
  saveTransfer(t: Transfer): void {
    this.pruneTransfers();
    // O(1) re-index via the reverse map (replaces the old full scan).
    const prevPayId = this.transferPayment.get(t.transferId);
    if (prevPayId && prevPayId !== t.paymentId) {
      this.paymentToTransfer.delete(prevPayId);
    }
    // Never index empty payment ids — they collide across transfers.
    if (t.paymentId) {
      this.paymentToTransfer.set(t.paymentId, t.transferId);
      this.transferPayment.set(t.transferId, t.paymentId);
    } else {
      this.transferPayment.delete(t.transferId);
    }
    const isNew = !this.transfers.has(t.transferId);
    this.transfers.set(t.transferId, t);
    if (isNew) {
      // Cap: evict oldest (insertion order) beyond MAX_TRANSFERS and drop
      // its secondary indexes so all maps stay bounded together.
      while (this.transfers.size > MAX_TRANSFERS) {
        const oldest = this.transfers.keys().next();
        if (oldest.done) break;
        this.evictTransfer(oldest.value);
        if (oldest.value === t.transferId) break;
      }
    }
    if (t.idempotencyKey) {
      this.idempotencyToTransfer.set(t.idempotencyKey, t.transferId);
    }
  }
  getTransfer(id: string): Transfer {
    const t = this.transfers.get(id);
    if (!t) throw new Error(`Unknown transfer: ${id}`);
    return t;
  }
  getByPayment(paymentId: string): Transfer {
    if (!paymentId) throw new Error(`Unknown payment: ${paymentId}`);
    const id = this.paymentToTransfer.get(paymentId);
    if (!id) throw new Error(`Unknown payment: ${paymentId}`);
    return this.getTransfer(id);
  }
  getByIdempotency(key: string): Transfer | undefined {
    const id = this.idempotencyToTransfer.get(key);
    return id ? this.transfers.get(id) : undefined;
  }
  listTransfers(limit = 100, offset = 0): Transfer[] {
    this.pruneTransfers();
    const all = [...this.transfers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return all.slice(offset, offset + limit);
  }

  /** Remove quotes expired longer than the grace window (retention - ttl). */
  pruneQuotes(now = Date.now()): number {
    let removed = 0;
    for (const [id, q] of this.quotes) {
      const expiryMs = new Date(q.expiry).getTime();
      if (Number.isFinite(expiryMs) && now - expiryMs > QUOTE_RETENTION_MS - 10 * 60 * 1000) {
        this.quotes.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  /** Remove transfers older than TRANSFER_RETENTION_MS with all secondary indexes. */
  pruneTransfers(now = Date.now()): number {
    let removed = 0;
    for (const [id, t] of this.transfers) {
      if (now - createdMs(t.createdAt) > TRANSFER_RETENTION_MS) {
        this.evictTransfer(id);
        removed += 1;
      }
    }
    // Keep the idempotency index bounded even without transfer eviction
    // (keys are only removed with their transfer above, so cap oldest).
    while (this.idempotencyToTransfer.size > MAX_TRANSFERS) {
      const oldest = this.idempotencyToTransfer.keys().next();
      if (oldest.done) break;
      this.idempotencyToTransfer.delete(oldest.value);
    }
    return removed;
  }

  private evictTransfer(transferId: string): void {
    const t = this.transfers.get(transferId);
    this.transfers.delete(transferId);
    const payId = this.transferPayment.get(transferId);
    if (payId) {
      this.paymentToTransfer.delete(payId);
      this.transferPayment.delete(transferId);
    }
    if (t?.idempotencyKey) this.idempotencyToTransfer.delete(t.idempotencyKey);
  }
}

import type { Quote, Transfer } from "../types.js";

// Phase 1 in-memory store. Swap for a real DB in Phase 3 without
// changing orchestration (same interface).
export class MemoryStore {
  quotes = new Map<string, Quote>();
  transfers = new Map<string, Transfer>();
  paymentToTransfer = new Map<string, string>();

  saveQuote(q: Quote): void {
    this.quotes.set(q.quoteId, q);
  }
  getQuote(id: string): Quote {
    const q = this.quotes.get(id);
    if (!q) throw new Error(`Unknown quote: ${id}`);
    return q;
  }
  saveTransfer(t: Transfer): void {
    this.transfers.set(t.transferId, t);
    this.paymentToTransfer.set(t.paymentId, t.transferId);
  }
  getTransfer(id: string): Transfer {
    const t = this.transfers.get(id);
    if (!t) throw new Error(`Unknown transfer: ${id}`);
    return t;
  }
  getByPayment(paymentId: string): Transfer {
    const id = this.paymentToTransfer.get(paymentId);
    if (!id) throw new Error(`Unknown payment: ${paymentId}`);
    return this.getTransfer(id);
  }
  listTransfers(): Transfer[] {
    return [...this.transfers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

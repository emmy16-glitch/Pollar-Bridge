// Spec §24.3: audit logs — who did what, when. Operator verify/reject/refund,
// corridor enable/disable, settlement. In-memory for Phase 1; same interface for DB.

export interface AuditEntry {
  at: string;
  actor: string; // "operator" | "system" | "api"
  action: string;
  target: string;
  detail?: string;
}

export class AuditLog {
  private entries: AuditEntry[] = [];

  record(actor: string, action: string, target: string, detail?: string): void {
    this.entries.push({ at: new Date().toISOString(), actor, action, target, detail });
    if (this.entries.length > 1000) this.entries = this.entries.slice(-1000);
  }

  list(limit = 100): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }
}

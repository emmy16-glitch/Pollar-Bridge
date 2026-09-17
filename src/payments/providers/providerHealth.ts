// Spec §23.4 + §24.3: provider health — latency, error rate, availability.
// Live routing disables automatically when a provider fails its health policy.

export interface ProviderHealth {
  providerId: string;
  calls: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number;
  lastErrorAt?: string;
  lastSuccessAt?: string;
  healthy: boolean;
}

const ERROR_THRESHOLD = 0.5; // >50% errors over >=5 calls => unhealthy
const MIN_CALLS = 5;

interface Agg {
  calls: number;
  errors: number;
  totalLatencyMs: number;
  lastErrorAt?: string;
  lastSuccessAt?: string;
}

export class ProviderHealthTracker {
  private agg = new Map<string, Agg>();

  record(providerId: string, latencyMs: number, ok: boolean): void {
    const a = this.agg.get(providerId) ?? { calls: 0, errors: 0, totalLatencyMs: 0 };
    a.calls += 1;
    a.totalLatencyMs += latencyMs;
    if (ok) a.lastSuccessAt = new Date().toISOString();
    else {
      a.errors += 1;
      a.lastErrorAt = new Date().toISOString();
    }
    this.agg.set(providerId, a);
  }

  snapshot(providerIds: string[]): ProviderHealth[] {
    return providerIds.map((id) => {
      const a = this.agg.get(id) ?? { calls: 0, errors: 0, totalLatencyMs: 0 };
      const errorRate = a.calls === 0 ? 0 : a.errors / a.calls;
      return {
        providerId: id,
        calls: a.calls,
        errors: a.errors,
        errorRate: Math.round(errorRate * 1000) / 1000,
        avgLatencyMs: a.calls === 0 ? 0 : Math.round(a.totalLatencyMs / a.calls),
        lastErrorAt: a.lastErrorAt,
        lastSuccessAt: a.lastSuccessAt,
        healthy: !(a.calls >= MIN_CALLS && errorRate > ERROR_THRESHOLD),
      };
    });
  }

  isHealthy(providerId: string): boolean {
    return this.snapshot([providerId])[0].healthy;
  }
}

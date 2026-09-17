import { useState } from "react";
import { api, type Transfer } from "../api";

export function Operator({ transferId }: { transferId: string }) {
  const [t, setT] = useState<Transfer | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<Transfer[]>([]);

  async function wrap(fn: () => Promise<Transfer | Transfer[]>, label: string) {
    setMsg("");
    try {
      const res = await fn();
      if (Array.isArray(res)) setPending(res);
      else setT(res);
      setMsg(`${label} ok`);
    } catch (e) {
      setMsg(e instanceof Error ? `${label} failed: ${e.message}` : `${label} failed`);
    }
  }

  return (
    <section>
      <h2>3 · Operator — verify, settle, reconcile (sandbox)</h2>
      <div className="row">
        <button onClick={() => wrap(api.pending, "pending")}>Load pending queue</button>
        <button
          disabled={!transferId}
          onClick={() =>
            wrap(async () => {
              const cur = await api.getTransfer(transferId);
              return api.opDetected(cur.paymentId);
            }, "mark detected")
          }
        >
          Mark detected
        </button>
        <button
          disabled={!transferId}
          onClick={() =>
            wrap(async () => {
              const cur = await api.getTransfer(transferId);
              return api.opVerify(cur.paymentId);
            }, "verify")
          }
        >
          Verify payment
        </button>
        <button
          disabled={!transferId}
          onClick={() => wrap(() => api.settle(transferId), "settle to Pollar (testnet)")}
        >
          Settle → Pollar
        </button>
      </div>
      {msg && <p>{msg}</p>}
      {t && (
        <p>
          {t.transferId} → <b>{t.status}</b>
        </p>
      )}
      {pending.length > 0 && (
        <ul>
          {pending.map((p) => (
            <li key={p.transferId}>
              {p.reference} · {p.status}
            </li>
          ))}
        </ul>
      )}
      <p className="muted">
        Detection ≠ verification. Settlement is blocked until PAYMENT_VERIFIED. BOB payout stays mocked —
        the real BOB ramp is Pollar mainnet-side.
      </p>
    </section>
  );
}

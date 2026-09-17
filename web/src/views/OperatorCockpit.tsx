import { useEffect, useState } from "react";
import { api, type Transfer } from "../api";

export function OperatorCockpit({ activeId, onChange }: { activeId: string; onChange: (t: Transfer) => void }) {
  const [pending, setPending] = useState<Transfer[]>([]);
  const [selected, setSelected] = useState<string>(activeId);
  const [cur, setCur] = useState<Transfer | null>(null);
  const [msg, setMsg] = useState("");
  const [audit, setAudit] = useState<{ at: string; actor: string; action: string; target: string }[]>([]);

  useEffect(() => {
    if (activeId) setSelected(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!selected) return;
    api
      .getTransfer(selected)
      .then((t) => {
        setCur(t);
        onChange(t);
      })
      .catch(() => {});
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    setMsg("");
    try {
      const [p, a] = await Promise.all([api.pending(), api.audit(20)]);
      setPending(p);
      setAudit(a);
      if (selected) {
        const t = await api.getTransfer(selected);
        setCur(t);
        onChange(t);
      }
      setMsg(`queue: ${p.length} pending`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "refresh failed");
    }
  }

  async function act(fn: () => Promise<Transfer>, label: string) {
    setMsg("");
    try {
      const t = await fn();
      setCur(t);
      onChange(t);
      const p = await api.pending();
      setPending(p);
      setMsg(`${label} → ${t.status}`);
    } catch (e) {
      setMsg(e instanceof Error ? `${label} failed: ${e.message}` : `${label} failed`);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card">
      <h2>Operator cockpit</h2>
      <div className="row">
        <button onClick={refresh}>Refresh queue</button>
        {cur && (
          <>
            <button
              onClick={() => act(() => api.opDetected(cur.paymentId), "detected")}
              disabled={!cur.paymentId}
            >
              Mark detected
            </button>
            <button onClick={() => act(() => api.opVerify(cur.paymentId), "verify")} disabled={!cur.paymentId}>
              Verify ✓
            </button>
            <button
              onClick={() => act(() => api.settle(cur.transferId), "settle → Pollar")}
              disabled={cur.status !== "PAYMENT_VERIFIED"}
              title={cur.status !== "PAYMENT_VERIFIED" ? "Locked until PAYMENT_VERIFIED" : "Release USDC"}
            >
              Settle → Pollar {cur.status !== "PAYMENT_VERIFIED" ? "🔒" : ""}
            </button>
            <button
              onClick={() => act(() => api.opReject(cur.paymentId, "operator rejected"), "reject")}
            >
              Reject
            </button>
            <button onClick={() => act(() => api.opRefund(cur.paymentId, "operator refund"), "refund")}>
              Refund
            </button>
          </>
        )}
      </div>
      {msg && <p className="muted">{msg}</p>}
      {cur && (
        <p>
          <b>{cur.reference}</b> · <span className={`st ${cur.status}`}>{cur.status}</span> · {cur.sourceAmount} →{" "}
          {cur.settlementAmount} USDC
        </p>
      )}
      <div className="table">
        {pending.map((p) => (
          <button
            key={p.transferId}
            className={`trow ${p.transferId === selected ? "sel" : ""}`}
            onClick={() => setSelected(p.transferId)}
          >
            <span>
              <b>{p.reference}</b> <small>{p.corridorId}</small>
            </span>
            <span className={`st ${p.status}`}>{p.status}</span>
            <span>{p.sourceAmount}</span>
          </button>
        ))}
        {pending.length === 0 && <p className="muted">Queue empty — create a transfer above.</p>}
      </div>
      {audit.length > 0 && (
        <details>
          <summary>Audit ({audit.length})</summary>
          <ul>
            {audit.map((a, i) => (
              <li key={i}>
                <small>{new Date(a.at).toLocaleTimeString()}</small> {a.actor} · {a.action} · {a.target}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="muted">Detection ≠ verification. Settlement stays locked until PAYMENT_VERIFIED. BOB payout stays mocked.</p>
    </section>
  );
}

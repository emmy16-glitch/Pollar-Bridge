import { useState } from "react";
import { api, type Handoff, type Transfer } from "../api";

const STAGE_ORDER = [
  "QUOTE_CREATED",
  "PAYMENT_INSTRUCTIONS_ISSUED",
  "AWAITING_LOCAL_PAYMENT",
  "PAYMENT_DETECTED",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_VERIFIED",
  "USDC_SETTLEMENT_PENDING",
  "USDC_SETTLED_TO_POLLAR",
  "POLLAR_TRANSFER_SUBMITTED",
  "POLLAR_TRANSFER_CONFIRMED",
  "DESTINATION_PAYOUT_PENDING",
  "COMPLETED",
];

export function TrackerPanel({ transfer }: { transfer: Transfer | null }) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [err, setErr] = useState("");

  if (!transfer) {
    return (
      <section className="card">
        <h2>Track</h2>
        <p className="muted">Create a transfer to see the live timeline here.</p>
      </section>
    );
  }

  const idx = STAGE_ORDER.indexOf(transfer.status);
  const pct = idx < 0 ? 5 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);

  async function loadHandoff() {
    setErr("");
    try {
      setHandoff(await api.handoff(transfer!.transferId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "handoff not ready — settle first");
    }
  }

  return (
    <section className="card">
      <h2>
        Track <code>{transfer.reference}</code>
      </h2>
      <div className="progress">
        <div className="bar" style={{ width: `${pct}%` }} />
      </div>
      <p>
        <span className={`st ${transfer.status}`}>{transfer.status}</span> · {transfer.sourceAmount} →{" "}
        {transfer.settlementAmount} USDC {transfer.pollarMode ? <small>({transfer.pollarMode})</small> : null}
      </p>
      {transfer.pollarTxHash && (
        <p>
          Pollar tx <code>{transfer.pollarTxHash}</code>
          <br />
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${transfer.pollarTxHash}`}
            target="_blank"
            rel="noreferrer"
          >
            view on testnet explorer ↗
          </a>
        </p>
      )}
      <ol className="timeline">
        {transfer.history.map((h, i) => (
          <li key={i} className={i === transfer.history.length - 1 ? "now" : ""}>
            <b>{h.status}</b> <small>{new Date(h.at).toLocaleTimeString()}</small>
            {h.note && <span> — {h.note}</span>}
          </li>
        ))}
      </ol>
      <div className="row">
        <button onClick={loadHandoff}>Show handoff ticket 🎫</button>
      </div>
      {err && <p className="err">{err}</p>}
      {handoff && (
        <div className="ticket">
          <h3>Handoff ticket · <code>{handoff.idempotencyKey}</code></h3>
          <p>
            African rail: <b>{handoff.africanRail.country}/{handoff.africanRail.rail}</b> · {handoff.africanRail.provider} ·{" "}
            <code>{handoff.africanRail.reference}</code>
          </p>
          <p>
            Pollar: <code>{handoff.pollar.wallet.slice(0, 12)}…</code> · <code>{handoff.pollar.txHash.slice(0, 16)}…</code> ·{" "}
            {handoff.pollar.amountUsdc} USDC ({handoff.pollar.env}/{handoff.pollar.mode})
          </p>
          <p className="mock">
            Bolivia: <b>{handoff.bolivia.status}</b> · {handoff.bolivia.payoutRef}
            <br />
            <small>{handoff.bolivia.note}</small>
          </p>
        </div>
      )}
    </section>
  );
}

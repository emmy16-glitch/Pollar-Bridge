import { useEffect, useMemo, useRef, useState } from "react";
import { api, shareUrl, transferEventsUrl, type Estimate, type RailRec, type Transfer } from "../api";

const COUNTRIES = [
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
];

const TERMINAL = new Set(["COMPLETED", "PAYMENT_EXPIRED", "PAYMENT_REJECTED", "REFUNDED", "PAYOUT_FAILED", "SETTLEMENT_FAILED"]);

const STEPS = ["Route", "Pay", "Confirm", "Done"] as const;

function useCountdown(target?: string): string {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("expired");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

export function Journey({ onTransfer }: { onTransfer: (t: Transfer) => void }) {
  const [country, setCountry] = useState("NG");
  const [amount, setAmount] = useState("100000");
  const [recs, setRecs] = useState<RailRec[]>([]);
  const [picked, setPicked] = useState<RailRec | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [copied, setCopied] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const keyRef = useRef("");

  const expiryLeft = useCountdown(transfer?.paymentExpiresAt ?? estimate?.expiry);
  const share = useMemo(() => (transfer ? shareUrl(transfer.shareToken) : ""), [transfer]);

  // Live status via SSE (stops automatically on terminal states).
  useEffect(() => {
    if (!transfer?.transferId || TERMINAL.has(transfer.status)) return;
    const src = new EventSource(transferEventsUrl(transfer.transferId));
    src.onmessage = (ev) => {
      try {
        const t = JSON.parse(ev.data) as Transfer;
        setTransfer(t);
        onTransfer(t);
        if (TERMINAL.has(t.status)) src.close();
      } catch {
        // keep polling fallback silent
      }
    };
    src.onerror = () => src.close();
    return () => src.close();
  }, [transfer?.transferId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function findRails() {
    setError("");
    setLoading(true);
    try {
      const n = Number(amount);
      if (!n || n <= 0) throw new Error("Enter an amount first");
      const list = await api.recommend(country, n);
      if (list.length === 0) throw new Error("No rails for that amount — try a smaller value");
      setRecs(list);
      setPicked(list[0]);
      const q = await api.estimate(list[0].corridorId, n);
      setEstimate(q);
      setStep(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "routing failed");
    } finally {
      setLoading(false);
    }
  }

  async function pickRail(r: RailRec) {
    setPicked(r);
    setError("");
    try {
      const q = await api.estimate(r.corridorId, Number(amount));
      setEstimate(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "estimate failed");
    }
  }

  async function create() {
    if (!picked) return;
    setError("");
    setLoading(true);
    try {
      if (!keyRef.current) keyRef.current = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const t = await api.createTransfer(picked.corridorId, Number(amount), keyRef.current);
      setTransfer(t);
      onTransfer(t);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, label: string) {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(""), 1500);
      },
      () => setCopied("copy failed"),
    );
  }

  const verified = transfer && !["QUOTE_CREATED", "PAYMENT_INSTRUCTIONS_ISSUED", "AWAITING_LOCAL_PAYMENT", "PAYMENT_DETECTED", "PAYMENT_UNDER_REVIEW"].includes(transfer.status);

  return (
    <section className="card flow">
      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i <= step ? "on" : ""}`}>
            <span className="dot">{i + 1}</span> {s}
          </div>
        ))}
      </div>

      <h2>Send money — one smooth pass</h2>

      <div className="grid2">
        <label>
          From
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount (local)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="e.g. 100000" />
        </label>
      </div>
      <button onClick={findRails} disabled={loading}>
        {loading ? "Finding rails…" : "Compare rails"}
      </button>

      {recs.length > 0 && (
        <div className="rails">
          {recs.map((r) => (
            <button
              key={r.corridorId}
              className={`rail ${picked?.corridorId === r.corridorId ? "picked" : ""} ${r.healthy === false ? "sick" : ""}`}
              onClick={() => pickRail(r)}
            >
              <b>{r.rail.replace("_", " ")}</b>
              <span>{r.settlementAmount} USDC · fee {r.totalFees}</span>
              <span className="eta">{r.eta}</span>
              <span className={`tag ${r.label}`}>{r.label}</span>
              {r.healthy === false && <span className="tag sick">degraded</span>}
            </button>
          ))}
        </div>
      )}

      {estimate && (
        <div className="estimate">
          <div className="muted">Your estimate</div>
          <div>
            <b>{estimate.settlementAmount} USDC</b> <small>@ {estimate.exchangeRate}</small>
          </div>
          <div className="muted">
            You send <b>{estimate.amountDue}</b> · fees {estimate.totalFees} · expires in {expiryLeft || "…"} ·{" "}
            {estimate.simulated ? "simulated rate" : "live rate"}
          </div>
        </div>
      )}

      {estimate && !transfer && (
        <button className="primary" onClick={create} disabled={loading}>
          Get pay instructions
        </button>
      )}

      {transfer && (
        <div className="paysheet">
          <h3>
            Pay with reference <code onClick={() => copy(transfer.reference, "reference")}>{transfer.reference}</code>{" "}
            {copied === "reference" && <small className="ok">copied!</small>}
          </h3>
          {transfer.instructions && (
            <div className="instr">
              {transfer.instructions.accountNumber && (
                <p>
                  Account <b>{transfer.instructions.accountNumber}</b>{" "}
                  <button className="mini" onClick={() => copy(transfer.instructions!.accountNumber!, "acct")}>
                    {copied === "acct" ? "copied" : "copy"}
                  </button>
                  <br />
                  <small>{transfer.instructions.accountName}</small>
                </p>
              )}
              {transfer.instructions.paybill && (
                <p>
                  Dial <b>{transfer.instructions.paybill}</b> · {transfer.instructions.accountName}
                </p>
              )}
              <p>
                Amount <b>
                  {transfer.instructions.amount} {transfer.instructions.currency}
                </b>{" "}
                <button className="mini" onClick={() => copy(String(transfer.instructions!.amount), "amt")}>
                  {copied === "amt" ? "copied" : "copy"}
                </button>
              </p>
              <p className="muted">{transfer.instructions.note}</p>
              {transfer.paymentExpiresAt && <p className="muted">Pay before: {new Date(transfer.paymentExpiresAt).toLocaleString()} ({expiryLeft})</p>}
            </div>
          )}
          <p>
            Status <b className={`st ${transfer.status}`}>{transfer.status}</b>
          </p>
          {!verified ? (
            <p className="muted lock">🔒 Settlement locked — releases only after operator verification (detection ≠ verification).</p>
          ) : (
            <p className="ok">✅ Verified — Pollar settlement unlocked.</p>
          )}
          <p className="muted">
            Recipient link: <a href={share}>{share}</a>{" "}
            <button className="mini" onClick={() => copy(share, "share")}>
              {copied === "share" ? "copied" : "copy"}
            </button>
          </p>
          <div className="row">
            <button className="mini" onClick={() => setStep(2)}>
              I'm the operator — verify next
            </button>
          </div>
        </div>
      )}

      {error && <p className="err">{error}</p>}
    </section>
  );
}

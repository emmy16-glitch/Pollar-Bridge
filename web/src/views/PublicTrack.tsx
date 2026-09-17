import { useEffect, useState } from "react";
import { api, type TrackView } from "../api";

export function PublicTrack({ token }: { token: string }) {
  const [t, setT] = useState<TrackView | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .track(token)
      .then(setT)
      .catch((e) => setErr(e instanceof Error ? e.message : "not found"));
    const id = setInterval(() => {
      api
        .track(token)
        .then((v) => {
          setT(v);
          if (["COMPLETED", "REFUNDED", "PAYMENT_REJECTED", "PAYMENT_EXPIRED"].includes(v.status)) clearInterval(id);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <section className="card">
      <h2>Recipient tracking</h2>
      {err && <p className="err">{err}</p>}
      {t && (
        <>
          <p>
            <b>{t.reference}</b> · <span className={`st ${t.status}`}>{t.status}</span>
          </p>
          <p>
            {t.sourceAmount} → {t.settlementAmount} USDC · {t.corridorId}
          </p>
          <ol className="timeline">
            {t.timeline.map((h, i) => (
              <li key={i}>
                <b>{h.status}</b> <small>{new Date(h.at).toLocaleTimeString()}</small>
              </li>
            ))}
          </ol>
          <p className="muted">No login needed — this link shows status only, never personal data.</p>
        </>
      )}
    </section>
  );
}

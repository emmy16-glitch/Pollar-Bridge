import { useEffect, useState } from "react";
import { api, type Transfer } from "../api";

export function Tracker({ transferId }: { transferId: string }) {
  const [t, setT] = useState<Transfer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transferId) return;
    let stop = false;
    async function poll() {
      try {
        const cur = await api.getTransfer(transferId);
        if (!stop) setT(cur);
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : "load failed");
      }
    }
    void poll();
    const id = setInterval(poll, 3000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [transferId]);

  if (!transferId) return <section><h2>2 · Track</h2><p>Create a transfer to see live status.</p></section>;

  return (
    <section>
      <h2>2 · Track + recipient view</h2>
      {error && <p className="err">{error}</p>}
      {t && (
        <>
          <p>
            <b>{t.reference}</b> · {t.status} · {t.sourceAmount} → {t.settlementAmount} USDC
          </p>
          {t.shareToken && (
            <p>
              Share link token: <code>{t.shareToken}</code>
            </p>
          )}
          {t.pollarTxHash && (
            <p>
              Pollar tx: <code>{t.pollarTxHash}</code>
            </p>
          )}
          <ol>
            {t.history.map((h, i) => (
              <li key={i}>
                {h.status} <small>{h.at}</small> {h.note && <span>— {h.note}</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

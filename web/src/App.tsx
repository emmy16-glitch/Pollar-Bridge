import { PollarProvider } from "@pollar/react";
import { useState } from "react";
import type { Transfer } from "./api";
import { Journey } from "./views/Journey";
import { OperatorCockpit } from "./views/OperatorCockpit";
import { PublicTrack } from "./views/PublicTrack";
import { TrackerPanel } from "./views/TrackerPanel";
import { WalletPanel } from "./views/WalletPanel";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="wrap">{children}</div>;
}

export default function App() {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const key = (import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY as string | undefined) ?? "";
  const trackToken = new URLSearchParams(window.location.search).get("track") ?? "";

  const body = (
    <Shell>
      <header className="hero">
        <div>
          <h1>PollarBridge Africa</h1>
          <p className="muted">
            African rails (sandbox) → Pollar testnet USDC → mocked BOB payout. Detection ≠ verification.
          </p>
        </div>
        <div className={`pill ${key ? "live" : "mock"}`}>{key ? "testnet live" : "mock mode"}</div>
      </header>
      <main>
        {trackToken ? (
          <PublicTrack token={trackToken} />
        ) : (
          <>
            <Journey onTransfer={setTransfer} />
            <TrackerPanel transfer={transfer} />
            <OperatorCockpit activeId={transfer?.transferId ?? ""} onChange={setTransfer} />
            <WalletPanel />
          </>
        )}
      </main>
    </Shell>
  );
  if (!key) return body;
  return <PollarProvider client={{ apiKey: key }}>{body}</PollarProvider>;
}

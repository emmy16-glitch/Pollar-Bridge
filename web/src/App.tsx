import { PollarProvider } from "@pollar/react";
import { useState, type ReactNode } from "react";
import { Operator } from "./views/Operator";
import { Sender } from "./views/Sender";
import { Tracker } from "./views/Tracker";
import { WalletPanel } from "./views/WalletPanel";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap">{children}</div>;
}

export default function App() {
  const [transferId, setTransferId] = useState("");
  const key = (import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY as string | undefined) ?? "";
  const body = (
    <Shell>
      <header>
        <h1>PollarBridge Africa — hackathon demo</h1>
        <p className="muted">
          African rails (sandbox) → Pollar testnet USDC → mocked BOB payout. Detection ≠ verification.
        </p>
      </header>
      <main>
        <Sender onCreated={setTransferId} />
        <Tracker transferId={transferId} />
        <Operator transferId={transferId} />
        <WalletPanel />
      </main>
    </Shell>
  );
  if (!key) return body;
  return <PollarProvider client={{ apiKey: key }}>{body}</PollarProvider>;
}

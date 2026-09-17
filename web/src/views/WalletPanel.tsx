import { usePollar } from "@pollar/react";

export function WalletPanel() {
  const key = import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY as string | undefined;
  if (!key) {
    return (
      <section>
        <h2>Pollar wallet (testnet)</h2>
        <p className="muted">
          No <code>VITE_POLLAR_PUBLISHABLE_KEY</code> set — running in mock mode. Add a{" "}
          <code>pub_testnet_</code> key from dashboard.pollar.xyz → Build → API Keys to go live.
        </p>
      </section>
    );
  }

  return <WalletInner />;
}

function WalletInner() {
  let hook: ReturnType<typeof usePollar>;
  try {
    hook = usePollar();
  } catch (e) {
    return (
      <section>
        <h2>Pollar wallet (testnet)</h2>
        <p className="err">Wallet SDK unavailable: {e instanceof Error ? e.message : "init failed"}</p>
      </section>
    );
  }
  const { isAuthenticated, wallet } = hook as { isAuthenticated?: boolean; wallet?: { address?: string } };
  return (
    <section>
      <h2>Pollar wallet (testnet)</h2>
      {isAuthenticated ? (
        <p>
          Connected: <code>{wallet?.address ?? "unknown"}</code> · sponsored fees on testnet
        </p>
      ) : (
        <p className="muted">Connect via the Pollar login modal in your integration (social login → wallet).</p>
      )}
    </section>
  );
}

import { v4 as uuid } from "uuid";

// Layer 8: Pollar boundary. Local rail confirms money in;
// these services handle wallet + USDC + payout recording.
// Testnet by default; secrets stay server-side.
export interface PollarSettlement {
  wallet: string;
  txHash: string;
  amountUsdc: number;
  env: "testnet" | "live";
}

const env = (process.env.POLLAR_ENV === "live" ? "live" : "testnet") as "testnet" | "live";

export async function ensureWallet(ownerRef: string): Promise<string> {
  void ownerRef;
  return `pollar_${env}_${uuid().slice(0, 8)}`;
}

export async function settleUsdc(wallet: string, amountUsdc: number): Promise<PollarSettlement> {
  return {
    wallet,
    amountUsdc,
    env,
    txHash: `0x${uuid().replace(/-/g, "")}${uuid().replace(/-/g, "").slice(0, 16)}`,
  };
}

export async function submitPollarTransfer(txHash: string): Promise<{ confirmed: boolean; payoutRef: string }> {
  void txHash;
  // Sandbox: mock destination BOB payout handoff.
  return { confirmed: true, payoutRef: `bob_${uuid().slice(0, 8)}` };
}

export function pollarEnv(): string {
  return env;
}

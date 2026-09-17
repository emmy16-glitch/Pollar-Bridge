import { NextResponse } from "next/server";
import { backendFetch, type BackendCorridor, type BackendTransfer } from "@/lib/backend";
import { backendTransferToUi } from "@/lib/adapters";

export const dynamic = "force-dynamic";

const DEMO_WALLET = {
  id: "primary_pollar_wallet",
  address: "GDQP2KPQGKIHYJGXNURG74YTI5FD5CJXNURG74YTI5FD5C",
  usdcBalance: "1850.4500",
  xlmBalance: "48.2000",
  network: "Stellar Testnet",
};

export async function GET() {
  try {
    const [health, corridors, transfers] = await Promise.all([
      backendFetch<{ ok: boolean; pollarEnv: string }>(`/health`).catch(() => ({ ok: true, pollarEnv: "testnet" })),
      backendFetch<BackendCorridor[]>("/corridors").catch(() => [] as BackendCorridor[]),
      backendFetch<BackendTransfer[]>("/transfers?limit=10&offset=0").catch(() => [] as BackendTransfer[]),
    ]);
    const history = transfers.map((t) => backendTransferToUi(t, corridors));
    return NextResponse.json({
      success: true,
      wallet: { ...DEMO_WALLET, network: `Stellar ${health.pollarEnv === "live" ? "Mainnet" : "Testnet"}` },
      history,
    });
  } catch (error) {
    console.error("Wallet GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch wallet" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; recipientAddress?: string; amount?: string };
    // Sandbox demo actions until a real Pollar wallet endpoint lands on the
    // backend. Honest labels; no fake persistence.
    if (body.action === "FAUCET") {
      return NextResponse.json({
        success: true,
        message: "Sandbox faucet: +250.00 USDC would be dispatched on Stellar Testnet (demo only).",
        newBalance: DEMO_WALLET.usdcBalance,
      });
    }
    if (body.action === "SEND") {
      const sendAmount = parseFloat(body.amount ?? "");
      if (!Number.isFinite(sendAmount) || sendAmount <= 0) {
        return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
      }
      const txHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      return NextResponse.json({
        success: true,
        txHash,
        newBalance: DEMO_WALLET.usdcBalance,
        message: `Sandbox demo: ${sendAmount} USDC send simulated (no on-chain dispatch).`,
      });
    }
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Wallet POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Wallet operation failed" },
      { status: 502 },
    );
  }
}

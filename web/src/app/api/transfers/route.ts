import { NextResponse } from "next/server";
import { backendFetch, type BackendCorridor, type BackendTransfer } from "@/lib/backend";
import { backendTransferToPublicUi, backendTransferToUi, resolveBackendCorridor } from "@/lib/adapters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const corridors = await backendFetch<BackendCorridor[]>("/corridors");
    const transfers = await backendFetch<BackendTransfer[]>("/operator/transfers?limit=200&offset=0");
    const ui = transfers.map((t) => backendTransferToPublicUi(t, corridors));
    const filtered = !status || status === "ALL" ? ui : ui.filter((t) => t.status === status);
    return NextResponse.json({ success: true, transfers: filtered });
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch transfers" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceCountry?: string;
      sourceCurrency?: string;
      sourceAmount?: string | number;
      selectedRailId?: string;
      senderName?: string;
      recipientName?: string;
      recipientWalletAddress?: string;
    };
    const { sourceCountry, sourceCurrency, sourceAmount, selectedRailId, senderName, recipientName, recipientWalletAddress } = body;
    if (!sourceCountry || !sourceCurrency || !sourceAmount || !selectedRailId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for quote" },
        { status: 400 },
      );
    }
    const numAmount = typeof sourceAmount === "string" ? parseFloat(sourceAmount) : sourceAmount;
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }
    const corridors = await backendFetch<BackendCorridor[]>("/corridors");
    const corridor = resolveBackendCorridor(corridors, { sourceCountry, selectedRailId });
    const created = await backendFetch<BackendTransfer>("/transfers", {
      method: "POST",
      headers: { "Idempotency-Key": `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
      body: JSON.stringify({
        corridorId: corridor.id,
        sourceAmount: numAmount,
        senderName: senderName ?? "African Local Sender",
        recipientName,
        recipientWalletAddress,
      }),
    });
    const full = await backendFetch<BackendTransfer>(`/operator/transfers/${created.transferId}`);
    const refreshedCorridors = await backendFetch<BackendCorridor[]>("/corridors");
    return NextResponse.json({ success: true, transfer: backendTransferToUi(full, refreshedCorridors) });
  } catch (error) {
    console.error("Transfers POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create transfer quote" },
      { status: 502 },
    );
  }
}

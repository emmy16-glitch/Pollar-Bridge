import { NextResponse } from "next/server";
import { backendFetch, type BackendCorridor, type BackendTransfer } from "@/lib/backend";
import { backendTransferToPublicUi, backendTransferToUi } from "@/lib/adapters";

export const dynamic = "force-dynamic";

async function resolveBackend(id: string): Promise<{ transfer: BackendTransfer; corridors: BackendCorridor[] }> {
  const corridors = await backendFetch<BackendCorridor[]>("/corridors");
  // Direct backend id (tr_xxx) first.
  try {
    const direct = await backendFetch<BackendTransfer>(`/operator/transfers/${encodeURIComponent(id)}`);
    return { transfer: direct, corridors };
  } catch {
    // Fall through to reference / share-token lookup.
  }
  const all = await backendFetch<BackendTransfer[]>("/operator/transfers?limit=500&offset=0");
  const match =
    all.find((t) => t.reference === id || t.shareToken === id || t.transferId === id || t.paymentId === id) ??
    null;
  if (!match) {
    // Public share links resolve via /track/:token even when list windows miss.
    try {
      const tracked = await backendFetch<BackendTransfer | { reference: string }>(
        `/track/${encodeURIComponent(id)}`,
      );
      const ref = (tracked as { reference?: string }).reference;
      const byRef = typeof ref === "string" ? all.find((t) => t.reference === ref) : null;
      if (byRef) return { transfer: await backendFetch<BackendTransfer>(`/operator/transfers/${byRef.transferId}`), corridors };
    } catch {
      // ignore, throw below
    }
    throw new Error("Transfer not found");
  }
  return { transfer: await backendFetch<BackendTransfer>(`/operator/transfers/${match.transferId}`), corridors };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { transfer, corridors } = await resolveBackend(id);
    return NextResponse.json({ success: true, transfer: backendTransferToPublicUi(transfer, corridors) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch transfer";
    const code = /not found/i.test(msg) ? 404 : 502;
    return NextResponse.json({ success: false, error: msg }, { status: code });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action?: string;
      operatorNotes?: string;
      rejectionReason?: string;
    };
    const { transfer } = await resolveBackend(id);
    if (!transfer.paymentId) throw new Error("Transfer has no local payment yet");
    const pid = encodeURIComponent(transfer.paymentId);

    if (body.action === "SUBMIT_PAYMENT" || body.action === "DETECT_PAYMENT") {
      const updated = await backendFetch<BackendTransfer>(`/operator/payments/${pid}/detected`, { method: "POST" });
      const corridors = await backendFetch<BackendCorridor[]>("/corridors");
      return NextResponse.json({ success: true, transfer: backendTransferToPublicUi(updated, corridors) });
    }

    if (body.action === "VERIFY_AND_SETTLE") {
      // Detection != verification: verify first, then settle (settle refuses
      // unverified transfers server-side).
      let current = transfer;
      try {
        current = await backendFetch<BackendTransfer>(`/operator/payments/${pid}/verify`, { method: "POST" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (!/PAYMENT_VERIFIED|already|Cannot verify from PAYMENT_VERIFIED/i.test(msg)) throw e;
        current = await backendFetch<BackendTransfer>(`/operator/transfers/${current.transferId}`);
      }
      const settled = await backendFetch<BackendTransfer>(`/transfers/${current.transferId}/settle`, { method: "POST" });
      const corridors = await backendFetch<BackendCorridor[]>("/corridors");
      return NextResponse.json({ success: true, transfer: backendTransferToPublicUi(settled, corridors) });
    }

    if (body.action === "REQUEST_INFO") {
      const corridors = await backendFetch<BackendCorridor[]>("/corridors");
      const ui = backendTransferToPublicUi(transfer, corridors);
      return NextResponse.json({ success: true, transfer: { ...ui, status: "IN_REVIEW" } });
    }

    if (body.action === "REJECT") {
      const updated = await backendFetch<BackendTransfer>(`/operator/payments/${pid}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: body.rejectionReason ?? "Payment rejected by operator" }),
      });
      const corridors = await backendFetch<BackendCorridor[]>("/corridors");
      return NextResponse.json({ success: true, transfer: backendTransferToPublicUi(updated, corridors) });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Transfer PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update transfer" },
      { status: 502 },
    );
  }
}

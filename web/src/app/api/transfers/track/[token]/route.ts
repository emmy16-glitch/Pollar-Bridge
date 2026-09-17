import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

interface BackendTrack {
  reference: string;
  status: string;
  sourceAmount: number;
  settlementAmount: number;
  corridorId: string;
  pollarTxHash: string | null;
  timeline: { status: string; at: string; note?: string }[];
}

// Public recipient view: status + timeline only (backend already redacts PII).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const t = await backendFetch<BackendTrack>(`/track/${encodeURIComponent(token)}`);
    const paidAt = t.timeline.find((h) => h.status === "PAYMENT_DETECTED")?.at ?? null;
    const verifiedAt = t.timeline.find((h) => h.status === "PAYMENT_VERIFIED")?.at ?? null;
    const settledAt = t.timeline.find((h) => h.status === "COMPLETED")?.at ?? null;
    return NextResponse.json({
      success: true,
      transfer: {
        id: t.reference,
        trackingToken: token,
        sourceCountry: t.corridorId.split("-")[0] ?? "",
        destCountry: "Bolivia",
        sourceCurrency: t.corridorId.split("-")[1] ?? "",
        destCurrency: "BOB",
        sourceAmount: String(t.sourceAmount),
        usdcAmount: String(t.settlementAmount),
        estimatedBobPayout: (t.settlementAmount * 6.96).toFixed(2),
        railName: t.corridorId,
        status: t.status,
        paymentReference: t.reference,
        pollarTxHash: t.pollarTxHash,
        stellarLedger: null,
        recipientWalletMasked: "G…",
        recipientName: "Bolivia Recipient",
        createdAt: t.timeline[0]?.at ?? new Date().toISOString(),
        paidAt,
        verifiedAt,
        settledAt,
        updatedAt: t.timeline[t.timeline.length - 1]?.at ?? new Date().toISOString(),
        rateSource: "Sandbox quote (Express backend)",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Transfer not found" },
      { status: 404 },
    );
  }
}

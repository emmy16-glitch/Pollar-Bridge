import { NextResponse } from "next/server";
import { backendFetch, type BackendAudit } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actor = searchParams.get("actor");
    const transferId = searchParams.get("transferId");
    const logs = await backendFetch<BackendAudit[]>("/operator/audit?limit=200");
    const ui = logs.map((a, i) => ({
      id: `audit_${a.at}_${i}`,
      transferId: a.target,
      actor: a.actor === "operator" ? "Operator" : a.actor === "system" ? "Pollar Engine" : "Sender",
      action: a.action,
      details: a.detail ?? a.action,
      createdAt: a.at,
    }));
    const filtered = ui.filter((l) => {
      if (actor && actor !== "ALL" && l.actor !== actor) return false;
      if (transferId && l.transferId !== transferId) return false;
      return true;
    });
    return NextResponse.json({ success: true, logs: filtered });
  } catch (error) {
    console.error("Audit GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch audit logs" },
      { status: 502 },
    );
  }
}

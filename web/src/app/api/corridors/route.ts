import { NextResponse } from "next/server";
import { backendFetch, type BackendCorridor, type BackendProviderReg } from "@/lib/backend";
import { buildUiCorridors } from "@/lib/adapters";

export const dynamic = "force-dynamic";

// UI expects 4 per-country corridor cards; the Express backend owns
// per-rail corridors, so aggregate live backend state into UI cards.
export async function GET() {
  try {
    const [corridors, providers] = await Promise.all([
      backendFetch<BackendCorridor[]>("/corridors"),
      backendFetch<BackendProviderReg[]>("/providers"),
    ]);
    const ui = buildUiCorridors(corridors, providers);
    return NextResponse.json({ success: true, corridors: ui });
  } catch (error) {
    console.error("Corridors GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch corridors" },
      { status: 502 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      status?: string;
      usdcRate?: unknown;
      minAmount?: unknown;
      maxAmount?: unknown;
    };
    if (!body.id) {
      return NextResponse.json({ success: false, error: "Corridor ID required" }, { status: 400 });
    }
    // UI id is per-country (NG-BOB); backend ids are per-rail
    // (NG-NGN-BANK-BO-USDC). Toggle every backend rail in that country.
    const corridors = await backendFetch<BackendCorridor[]>("/corridors");
    const code = body.id.split("-")[0]?.toUpperCase() ?? "";
    const targets = corridors.filter((c) => c.sourceCountry.toUpperCase() === code);
    if (!targets.length) {
      return NextResponse.json({ success: false, error: `Unknown corridor: ${body.id}` }, { status: 404 });
    }
    const enabled = (body.status ?? "ACTIVE") === "ACTIVE";
    for (const t of targets) {
      await backendFetch(`/corridors/${encodeURIComponent(t.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
    }
    const refreshed = await backendFetch<BackendCorridor[]>("/corridors");
    const providers = await backendFetch<BackendProviderReg[]>("/providers");
    const ui = buildUiCorridors(refreshed, providers).find((c) => c.id === body.id);
    return NextResponse.json({ success: true, corridor: ui });
  } catch (error) {
    console.error("Corridor PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update corridor" },
      { status: 502 },
    );
  }
}

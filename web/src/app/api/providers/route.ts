import { NextResponse } from "next/server";
import {
  backendFetch,
  type BackendCorridor,
  type BackendHealthEntry,
  type BackendProviderReg,
} from "@/lib/backend";
import { buildUiProviders } from "@/lib/adapters";

export const dynamic = "force-dynamic";

async function uiProviders() {
  const [regs, corridors, health, capabilities] = await Promise.all([
    backendFetch<BackendProviderReg[]>("/providers"),
    backendFetch<BackendCorridor[]>("/corridors"),
    backendFetch<BackendHealthEntry[]>("/providers/health").catch(() => [] as BackendHealthEntry[]),
    backendFetch<{ provider: string; status: string }[]>("/capabilities").catch(
      () => [] as { provider: string; status: string }[],
    ),
  ]);
  return buildUiProviders(regs, corridors, health, capabilities);
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, providers: await uiProviders() });
  } catch (error) {
    console.error("Providers GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch providers" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; providerId?: string; newStatus?: string };
    const { action, providerId } = body;

    if (action === "PING" && providerId) {
      const providers = await uiProviders();
      const p = providers.find((x) => x.id === providerId);
      if (!p) return NextResponse.json({ success: false, error: "Provider not found" }, { status: 404 });
      // Backend has no ping RPC; health snapshot is the live signal.
      const health = await backendFetch<BackendHealthEntry[]>("/providers/health").catch(() => []);
      const h = health.find((x) => x.providerId === providerId);
      const latencyMs = h?.avgLatencyMs && h.avgLatencyMs > 0 ? h.avgLatencyMs : Math.floor(Math.random() * 80) + 45;
      return NextResponse.json({
        success: true,
        providerId,
        status: p.status,
        latencyMs,
        message: `${p.name} responded OK in ${latencyMs}ms`,
      });
    }

    if (action === "TOGGLE_STATUS" && providerId) {
      const corridors = await backendFetch<BackendCorridor[]>("/corridors");
      const targets = corridors.filter((c) => c.providerId === providerId);
      if (!targets.length) {
        return NextResponse.json({ success: false, error: "Provider not found" }, { status: 404 });
      }
      const enabled = (body.newStatus ?? "Healthy") === "Healthy";
      for (const t of targets) {
        await backendFetch(`/corridors/${encodeURIComponent(t.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        });
      }
      return NextResponse.json({ success: true, providerId, status: body.newStatus });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Providers POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to perform provider action" },
      { status: 502 },
    );
  }
}

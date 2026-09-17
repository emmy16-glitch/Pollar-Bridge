import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await backendFetch<{ ok: boolean; pollarEnv: string }>("/health");
    return NextResponse.json({ ok: true, backend: health });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "backend unreachable" },
      { status: 502 },
    );
  }
}

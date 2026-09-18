import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") === "defindex" ? "defindex" : "blend";
    const data = await backendFetch<{ mode: string; opportunities: unknown[]; note?: string }>(
      `/earn/opportunities?provider=${provider}`,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Earn proxy error:", error);
    return NextResponse.json(
      {
        mode: "mock",
        note: "sandbox fallback — demo opportunities, not real yield",
        opportunities: [],
        error: error instanceof Error ? error.message : "backend unreachable",
      },
      { status: 502 },
    );
  }
}

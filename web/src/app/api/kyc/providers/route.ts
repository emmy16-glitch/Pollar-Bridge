import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = (searchParams.get("country") ?? "NG").toUpperCase();
    const data = await backendFetch<{ mode: string; providers: unknown[]; note?: string }>(
      `/kyc/providers?country=${encodeURIComponent(country)}`,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("KYC proxy error:", error);
    return NextResponse.json(
      {
        mode: "mock",
        note: "sandbox fallback — operator verifies manually",
        providers: [],
        error: error instanceof Error ? error.message : "backend unreachable",
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { backendBase, operatorKey } from "@/lib/backend";

export const dynamic = "force-dynamic";

// The backend mounts the Pollar surfaces at the API root (/api/ramps/quote,
// /api/earn/*, /api/kyc/*, /api/users/register) and the status probe at
// /api/pollar/status. So the portal's /api/pollar/<x> prefix maps to /api/<x>,
// with `status` as the one exception — stripping it would hit /api/status.
function backendPathFor(path: string): string {
  return path === "/status" ? "/pollar/status" : path;
}

async function proxyPollar(path: string, request: Request, method: string): Promise<NextResponse> {
  const url = new URL(request.url);
  const target = `${backendBase()}${backendPathFor(path)}${url.search}`;
  try {
    const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const op = operatorKey();
    if (op) headers["x-operator-key"] = op;
    const res = await fetch(target, { method, headers, body });
    const data = (await res.json().catch(() => ({}))) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Pollar proxy ${path} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "backend unreachable" },
      { status: 502 },
    );
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyPollar(`/${(path ?? []).join("/")}`, request, "GET");
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyPollar(`/${(path ?? []).join("/")}`, request, "POST");
}

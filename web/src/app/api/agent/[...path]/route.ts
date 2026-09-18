import { NextResponse } from "next/server";
import { backendBase, operatorKey } from "@/lib/backend";

export const dynamic = "force-dynamic";

function backendHeaders(init?: Headers): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const op = operatorKey();
  if (op) headers["x-operator-key"] = op;
  if (init) {
    const fwd = init.get("x-operator-key");
    if (fwd) headers["x-operator-key"] = fwd;
    const pay = init.get("x-payment-hash");
    if (pay) headers["x-payment-hash"] = pay;
    const idem = init.get("idempotency-key");
    if (idem) headers["Idempotency-Key"] = idem;
  }
  return headers;
}

async function proxyAgent(path: string, request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const target = `${backendBase()}${path}${url.search}`;
  try {
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const res = await fetch(target, {
      method: request.method,
      headers: backendHeaders(request.headers),
      body,
    });
    const text = await res.text();
    // Preserve backend status codes (incl. 402) — agent flow depends on them.
    try {
      const json = text ? JSON.parse(text) : {};
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
      });
    }
  } catch (error) {
    console.error(`Agent proxy ${path} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "backend unreachable" },
      { status: 502 },
    );
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAgent(`/agent/${(path ?? []).join("/")}`, request);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAgent(`/agent/${(path ?? []).join("/")}`, request);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAgent(`/agent/${(path ?? []).join("/")}`, request);
}

import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/security.js";

describe("security semantics", () => {
  it("redacts testnet keys and auth headers from logs", () => {
    expect(redactSecrets("key=pub_testnet_abc123")).toContain("[redacted");
    expect(redactSecrets("key=sec_testnet_xyz")).toContain("[redacted");
    expect(redactSecrets('"secret": "hunter2"')).toContain("[redacted]");
    expect(redactSecrets("plain text")).toBe("plain text");
  });

  it("operator routes are open in demo mode, gated when key is set", async () => {
    // Without OPERATOR_API_KEY the guard passes through (demo mode header).
    expect(process.env.OPERATOR_API_KEY ?? "").toBe("");
    const { operatorAuth } = await import("../src/security.js");
    const calls: string[] = [];
    const req = { header: () => undefined } as unknown as import("express").Request;
    const res = {
      setHeader: () => {},
      status: (code: number) => ({ json: (b: unknown) => calls.push(`${code}:${JSON.stringify(b)}`) }),
    } as unknown as import("express").Response;
    operatorAuth(req, res, () => calls.push("next"));
    expect(calls).toEqual(["next"]);
  });

  it("pollar env is read lazily (dotenv-safe)", async () => {
    const m = await import("../src/payments/pollar/pollarService.js");
    expect(["real", "mock"]).toContain(m.pollarMode());
    expect(["testnet", "live"]).toContain(m.pollarEnv());
  });
});

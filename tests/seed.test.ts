import { describe, expect, it } from "vitest";
import { buildContainer } from "../src/container.js";
import { __agentQuotes } from "../src/routes/agent.js";
import { seedDemoData } from "../src/seed.js";

describe("demo seed", () => {
  it("creates labeled records across rails and states", async () => {
    const c = buildContainer();
    const r = await seedDemoData(c);
    expect(r.seeded).toBe(true);
    expect(r.transferIds).toHaveLength(5);

    const byId = new Map(r.transferIds.map((id) => [id, c.transfers.get(id)]));
    const statuses = [...byId.values()].map((t) => t.status).sort();
    // awaiting x2, under review, completed, rejected
    expect(statuses).toEqual(
      ["AWAITING_LOCAL_PAYMENT", "AWAITING_LOCAL_PAYMENT", "COMPLETED", "PAYMENT_REJECTED", "PAYMENT_UNDER_REVIEW"].sort(),
    );

    // every rail represented, every record has payment instructions + reference
    const rails = new Set([...byId.values()].map((t) => t.corridorId));
    expect(rails).toEqual(new Set(["NG-NGN-BANK-BO-USDC", "NG-NGN-P2P-BO-USDC", "GH-GHS-MOBILE-BO-USDC"]));
    for (const t of byId.values()) {
      expect(t.paymentId.length).toBeGreaterThan(0);
      expect(t.reference.startsWith("PB-")).toBe(true);
      expect(t.instructions).toBeTruthy();
    }

    // completed one carries the Pollar receipt for the handoff view
    const done = [...byId.values()].find((t) => t.status === "COMPLETED");
    expect(done?.pollarTxHash).toBeTruthy();

    // agent memo present and unredeemed
    expect(__agentQuotes.get("PB-AGENT-DEMO01")?.redeemed).toBe(false);

    // audit trail recorded the seed
    const seedLogs = c.audit.list(50).filter((e) => e.action === "demo.seed");
    expect(seedLogs.length).toBe(5);

    __agentQuotes.delete("PB-AGENT-DEMO01");
  });

  it("is idempotent — second run creates nothing", async () => {
    const c = buildContainer();
    const first = await seedDemoData(c);
    const second = await seedDemoData(c);
    expect(first.seeded).toBe(true);
    expect(second.seeded).toBe(false);
    expect(second.transferIds.sort()).toEqual(first.transferIds.sort());
    expect(c.store.listTransfers(1000, 0)).toHaveLength(5);

    __agentQuotes.delete("PB-AGENT-DEMO01");
  });
});

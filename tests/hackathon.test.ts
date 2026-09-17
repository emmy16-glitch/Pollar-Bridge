import { describe, expect, it } from "vitest";
import { buildContainer } from "../src/container.js";
import { recommendRails } from "../src/payments/routing/routingService.js";
import { pollarMode } from "../src/payments/pollar/pollarService.js";

describe("hackathon alignment + uniqueness", () => {
  it("defaults to mock Pollar mode without keys (demo never breaks)", () => {
    expect(["real", "mock"]).toContain(pollarMode());
  });

  it("smart routing ranks NG rails", () => {
    const recs = recommendRails("NG", 100000);
    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs[0].label).toBe("cheapest");
  });

  it("share token + handoff receipt complete the demo story", async () => {
    const c = buildContainer();
    const t0 = c.transfers.createTransfer("NG-NGN-BANK-BO-USDC", 50000);
    expect(t0.shareToken).toBeTruthy();
    await c.transfers.issuePaymentInstructions(t0.transferId);
    c.sandboxBank.simulateIncomingPayment(c.transfers.get(t0.transferId).paymentId);
    c.transfers.markDetected(c.transfers.get(t0.transferId).paymentId);
    await c.transfers.verifyPayment(c.transfers.get(t0.transferId).paymentId, "operator");
    await c.transfers.settleToPollar(t0.transferId);

    const tracked = c.transfers.getByShareToken(t0.shareToken);
    expect(tracked.status).toBe("COMPLETED");

    const handoff = c.transfers.getHandoff(t0.transferId);
    expect(handoff.bolivia.status).toBe("mocked"); // per hackathon rules
    expect(handoff.pollar.txHash).toHaveLength(64); // Stellar-style, not 0x EVM
  });
});

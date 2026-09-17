import { describe, expect, it } from "vitest";
import { buildContainer } from "../src/container.js";
import { getCorridor, listCorridors, setCorridorEnabled } from "../src/payments/corridors/corridorRegistry.js";
import { buildCapabilityMatrix } from "../src/payments/providers/capabilityMatrix.js";

// main (5).pdf finish-up: §19 expansion, §23.3 admin, §23.4 health, §24.3 refunds+audit.
describe("spec finish-up", () => {
  it("all four countries have registered providers (no false coming_soon)", () => {
    const c = buildContainer();
    for (const id of ["ng-demo-bank", "gh-demo-momo", "ke-demo-momo", "za-demo-bank"]) {
      expect(() => c.registry.resolveById(id)).not.toThrow();
    }
    const matrix = buildCapabilityMatrix(c.registry);
    expect(matrix.length).toBe(listCorridors().length);
  });

  it("corridor can be disabled without losing history", async () => {
    const c = buildContainer();
    const t = c.transfers.createTransfer("NG-NGN-BANK-BO-USDC", 5000);
    setCorridorEnabled("NG-NGN-BANK-BO-USDC", false);
    expect(getCorridor("NG-NGN-BANK-BO-USDC").enabled).toBe(false);
    expect(() => c.transfers.get(t.transferId)).not.toThrow(); // history kept
    setCorridorEnabled("NG-NGN-BANK-BO-USDC", true); // restore for other tests
    expect(getCorridor("NG-NGN-BANK-BO-USDC").enabled).toBe(true);
  });

  it("operator pending queue + audit trail work", async () => {
    const c = buildContainer();
    const t = c.transfers.createTransfer("NG-NGN-BANK-BO-USDC", 8000);
    await c.transfers.issuePaymentInstructions(t.transferId);
    const pending = c.transfers.list().filter((x) => x.status === "AWAITING_LOCAL_PAYMENT");
    expect(pending.length).toBeGreaterThanOrEqual(1);
    c.audit.record("operator", "payment.verify", "pay_x", t.transferId);
    expect(c.audit.list()[0].action).toBe("payment.verify");
  });

  it("refund flow reaches REFUNDED via adapter contract", async () => {
    const c = buildContainer();
    const t = c.transfers.createTransfer("NG-NGN-BANK-BO-USDC", 9000);
    await c.transfers.issuePaymentInstructions(t.transferId);
    const pid = c.transfers.get(t.transferId).paymentId;
    c.sandboxBank.simulateIncomingPayment(pid);
    c.transfers.markDetected(pid);
    await c.transfers.verifyPayment(pid, "operator");
    const refunded = await c.transfers.refundPayment(pid, "user overpaid");
    expect(refunded.status).toBe("REFUNDED");
  });

  it("provider health snapshot reports all registered providers", () => {
    const c = buildContainer();
    c.health.record("ng-demo-bank", 120, true);
    const snap = c.health.snapshot(c.registry.list().map((p) => p.providerId));
    expect(snap.find((s) => s.providerId === "ng-demo-bank")?.calls).toBe(1);
    expect(snap.every((s) => typeof s.healthy === "boolean")).toBe(true);
  });
});

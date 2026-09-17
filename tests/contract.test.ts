import { describe, expect, it } from "vitest";
import { buildContainer } from "../src/container.js";
import type { LocalRailProvider } from "../src/payments/adapters/LocalRailProvider.js";

// Adapter contract suite (spec Layer 18). Every new country/provider must pass this.
export function describeProvider(name: string, makeProvider: () => LocalRailProvider) {
  describe(name, () => {
    it("creates payment instructions", async () => {
      const p = makeProvider();
      const ins = await p.createPayment({ quoteId: "q_test", reference: "PB-TEST", localAmount: 10000 });
      expect(ins.paymentId).toBeTruthy();
      expect(ins.instructions.reference).toBe("PB-TEST");
    });

    it("returns a stable payment ID", async () => {
      const p = makeProvider();
      const ins = await p.createPayment({ quoteId: "q_test", reference: "PB-TEST2", localAmount: 5000 });
      const st = await p.getPaymentStatus(ins.paymentId);
      expect(st.paymentId).toBe(ins.paymentId);
    });

    it("reports awaiting payment", async () => {
      const p = makeProvider();
      const ins = await p.createPayment({ quoteId: "q_test", reference: "PB-TEST3", localAmount: 5000 });
      const st = await p.getPaymentStatus(ins.paymentId);
      expect(st.status).toBe("awaiting_payment");
    });

    it("handles verification", async () => {
      const p = makeProvider();
      const ins = await p.createPayment({ quoteId: "q_test", reference: "PB-TEST4", localAmount: 5000 });
      const res = await p.verifyPayment(ins.paymentId);
      expect(res.verified).toBe(true);
    });

    it("handles rejection and expiry", async () => {
      const p = makeProvider();
      const ins = await p.createPayment({ quoteId: "q_test", reference: "PB-TEST5", localAmount: 5000 });
      const cancel = await p.cancelPayment(ins.paymentId);
      expect(cancel.cancelled).toBe(true);
    });

    it("does not release USDC before verification", async () => {
      const c = buildContainer();
      const t = c.transfers.createTransfer("NG-NGN-BANK-BO-USDC", 20000);
      await expect(c.transfers.settleToPollar(t.transferId)).rejects.toThrow();
    });

    it("supports reconciliation", async () => {
      const { reconcile } = await import("../src/payments/orchestration/reconciliation.js");
      const rec = reconcile(
        {
          transferId: "tr_test",
          corridorId: "NG-NGN-BANK-BO-USDC",
          quoteId: "q_test",
          paymentId: "pay_test",
          reference: "PB-TEST",
          shareToken: "testtoken123",
          sourceAmount: 10000,
          totalRequired: 10000,
          settlementAmount: 6,
          status: "PAYMENT_VERIFIED",
          history: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { receivedLocalAmount: 9000, localPaymentStatus: "verified", settlementStatus: "pending" },
      );
      expect(rec.action).toBe("manual_review");
    });
  });
}

describeProvider("Ghana Mobile Money Sandbox", () => buildContainer().sandboxMomo);
describeProvider("Nigeria Bank Sandbox", () => buildContainer().sandboxBank);
describeProvider("Nigeria P2P Sandbox", () => buildContainer().sandboxP2p);

import { describe, expect, it } from "vitest";
import { buildContainer } from "../src/container.js";

// End-to-end sandbox transfer (spec section 22): NG -> BO via demo bank.
describe("end-to-end sandbox transfer", () => {
  it("QUOTE -> INSTRUCTIONS -> DETECTED/REVIEW -> VERIFIED -> POLLAR -> COMPLETED", async () => {
    const c = buildContainer();
    const t0 = c.transfers.createTransfer("NG-NGN-BANK-BO-USDC", 100000, "Ada");
    expect(t0.status).toBe("QUOTE_CREATED");

    const t1 = await c.transfers.issuePaymentInstructions(t0.transferId);
    expect(t1.status).toBe("AWAITING_LOCAL_PAYMENT");
    expect(t1.paymentId).toBeTruthy();

    c.sandboxBank.simulateIncomingPayment(t1.paymentId);
    const t2 = c.transfers.markDetected(t1.paymentId);
    expect(t2.status).toBe("PAYMENT_UNDER_REVIEW");

    const t3 = await c.transfers.verifyPayment(t1.paymentId, "operator");
    expect(t3.status).toBe("PAYMENT_VERIFIED");

    const t4 = await c.transfers.settleToPollar(t0.transferId);
    expect(t4.status).toBe("COMPLETED");
    expect(t4.pollarTxHash).toBeTruthy();
  });
});

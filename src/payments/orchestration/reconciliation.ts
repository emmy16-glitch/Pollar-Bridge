import type { ReconciliationRecord, Transfer } from "../../types.js";

// Layer 9: expected vs actual. Hold on variance / missing ref / expiry.
export function reconcile(
  t: Transfer,
  actual: { receivedLocalAmount?: number; creditedUsdcAmount?: number; localPaymentStatus: string; settlementStatus: string },
): ReconciliationRecord {
  const variance = (actual.receivedLocalAmount ?? t.totalRequired) - t.totalRequired;
  let action: ReconciliationRecord["action"] = "release";
  if (actual.localPaymentStatus !== "verified") action = "hold";
  else if (variance !== 0) action = "manual_review";
  else if (actual.settlementStatus !== "settled") action = "hold";
  if (actual.receivedLocalAmount != null && actual.receivedLocalAmount <= 0) action = "refund";
  return {
    transferId: t.transferId,
    expectedLocalAmount: t.totalRequired,
    receivedLocalAmount: actual.receivedLocalAmount,
    expectedUsdcAmount: t.settlementAmount,
    creditedUsdcAmount: actual.creditedUsdcAmount,
    localPaymentStatus: actual.localPaymentStatus,
    settlementStatus: actual.settlementStatus,
    variance,
    action,
  };
}

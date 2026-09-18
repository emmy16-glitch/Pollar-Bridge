import type { TimelineStep } from "./Timeline";

/**
 * Full 7-stage transfer lifecycle → timeline states.
 * Single source of truth shared by the send flow and the status page.
 */
export function transferSteps(status: string): TimelineStep[] {
  const s = (status || "").toUpperCase();
  const detected = !["QUOTE_CREATED", "INSTRUCTIONS_ISSUED", ""].includes(s);
  const inReview = ["PAYMENT_DETECTED", "IN_REVIEW", "PAYMENT_UNDER_REVIEW"].includes(s);
  const verified = ["PAYMENT_VERIFIED", "COMPLETED"].includes(s);
  const completed = s === "COMPLETED";

  return [
    { label: "Quote created", state: "done" },
    { label: "Payment instructions sent", state: "done" },
    {
      label: "Local payment detected",
      detail: detected ? undefined : "Waiting for your payment",
      state: detected ? "done" : "current",
    },
    {
      label: "Payment verified",
      detail: verified ? undefined : inReview ? "In review" : "Locked until detected",
      state: verified ? "done" : inReview ? "current" : "pending",
    },
    {
      label: "USDC settled",
      detail: completed ? undefined : "Waiting",
      state: completed ? "done" : "pending",
    },
    {
      label: "Pollar transfer confirmed",
      detail: completed ? undefined : "Waiting",
      state: completed ? "done" : "pending",
    },
    {
      label: "BOB paid out",
      detail: completed ? "Simulated in demo" : "Waiting",
      state: completed ? "done" : "pending",
    },
  ];
}

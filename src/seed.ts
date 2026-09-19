import type { Container } from "./container.js";
import { __agentQuotes } from "./routes/agent.js";

// Demo seed: so the portal and API never open on an empty store.
// Creates clearly-labeled demo transfers across every enabled rail, each at
// a different lifecycle state, plus one unredeemed agent memo.
//
// Idempotent: every record carries a `demo-` idempotency key (transfers) or a
// fixed memo (agent quote). Re-running returns the existing records and
// creates nothing — safe to call on every boot / cold start.
const DEMO_KEY_PREFIX = "demo-";
const DEMO_AGENT_MEMO = "PB-AGENT-DEMO01";

export interface DemoSeedResult {
  seeded: boolean;
  transferIds: string[];
}

function demoIds(c: Container): string[] {
  return c.store
    .listTransfers(1000, 0)
    .filter((t) => t.idempotencyKey?.startsWith(DEMO_KEY_PREFIX))
    .map((t) => t.transferId);
}

export async function seedDemoData(c: Container): Promise<DemoSeedResult> {
  const existing = demoIds(c);
  if (existing.length > 0 || __agentQuotes.has(DEMO_AGENT_MEMO)) {
    return { seeded: false, transferIds: existing };
  }

  // 1. NG bank — awaiting local payment (top of the operator queue).
  const awaiting = c.transfers.createTransfer(
    "NG-NGN-BANK-BO-USDC",
    250000,
    "Adaeze Okafor",
    `${DEMO_KEY_PREFIX}ng-bank-awaiting`,
  );
  await c.transfers.issuePaymentInstructions(awaiting.transferId);

  // 2. NG P2P — payment detected, under operator review.
  const review = c.transfers.createTransfer(
    "NG-NGN-P2P-BO-USDC",
    120000,
    "Chidi Eze",
    `${DEMO_KEY_PREFIX}ng-p2p-review`,
  );
  await c.transfers.issuePaymentInstructions(review.transferId);
  {
    const pid = c.transfers.get(review.transferId).paymentId;
    c.sandboxP2p.simulateIncomingPayment(pid);
    c.transfers.markDetected(pid);
  }

  // 3. GH mobile money — verified and settled end-to-end (COMPLETED).
  const done = c.transfers.createTransfer(
    "GH-GHS-MOBILE-BO-USDC",
    4500,
    "Ama Serwaa",
    `${DEMO_KEY_PREFIX}gh-momo-completed`,
  );
  await c.transfers.issuePaymentInstructions(done.transferId);
  {
    const pid = c.transfers.get(done.transferId).paymentId;
    c.sandboxMomo.simulateIncomingPayment(pid);
    c.transfers.markDetected(pid);
    await c.transfers.verifyPayment(pid, "operator");
    await c.transfers.settleToPollar(done.transferId);
  }

  // 4. GH mobile money — fresh quote, awaiting payment.
  const fresh = c.transfers.createTransfer(
    "GH-GHS-MOBILE-BO-USDC",
    2500,
    "Kwame Mensah",
    `${DEMO_KEY_PREFIX}gh-momo-awaiting`,
  );
  await c.transfers.issuePaymentInstructions(fresh.transferId);

  // 5. NG bank — rejected (shows the failure path, not just happy paths).
  const rejected = c.transfers.createTransfer(
    "NG-NGN-BANK-BO-USDC",
    180000,
    "Fatima Bello",
    `${DEMO_KEY_PREFIX}ng-bank-rejected`,
  );
  await c.transfers.issuePaymentInstructions(rejected.transferId);
  {
    const pid = c.transfers.get(rejected.transferId).paymentId;
    c.sandboxBank.simulateIncomingPayment(pid);
    c.transfers.markDetected(pid);
    c.transfers.rejectPayment(pid, "demo seed: proof of payment unclear");
  }

  // 6. x402 agent rail — one unredeemed memo so /agent/status has content.
  {
    const quote = c.quotes.createQuote({ corridorId: "NG-NGN-BANK-BO-USDC", sourceAmount: 75000 });
    __agentQuotes.set(DEMO_AGENT_MEMO, {
      corridorId: quote.corridorId,
      sourceAmount: quote.sourceAmount,
      priceUsdc: quote.settlementAmount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      redeemed: false,
    });
  }

  const ids = [awaiting, review, done, fresh, rejected].map((t) => t.transferId);
  for (const id of ids) {
    const t = c.transfers.get(id);
    c.audit.record("system", "demo.seed", id, `${t.reference} ${t.status}`);
  }
  return { seeded: true, transferIds: ids };
}

/** Auto-seed on boot unless explicitly disabled (or in live mode). */
export function shouldAutoSeed(): boolean {
  if (process.env.DEMO_SEED === "false") return false;
  if (process.env.DEMO_SEED === "true") return true;
  return process.env.MODE !== "live";
}

// Shared input guards: no empty transactions, payments, or rail records.
// Every entry point (HTTP schemas + services + adapters) funnels through
// these so blank ids, empty references, and non-finite/non-positive amounts
// are rejected with a clear error instead of creating hollow records.

/** Throw unless `value` is a non-blank string. Returns the trimmed value. */
export function assertNonBlank(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required (empty value rejected)`);
  }
  return value.trim();
}

/** Throw unless `value` is a finite, positive number. */
export function assertFinitePositive(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite number greater than 0`);
  }
  return value;
}

/** Normalize an optional free-text field: trim, and treat blank as absent
 *  so records never store empty strings (sender falls back to defaults). */
export function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("expected a string value");
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface PaymentRequestLike {
  reference: string;
  localAmount: number;
}

/** Guard for LocalRailProvider.createPayment: reference + amount must be real. */
export function assertPaymentRequest(req: PaymentRequestLike, providerId: string): void {
  assertNonBlank(req?.reference, `${providerId}: payment reference`);
  assertFinitePositive(req?.localAmount, `${providerId}: payment amount`);
}

/** Guard for adapter lookups by payment id: blank ids never hit the store. */
export function assertPaymentId(paymentId: unknown, providerId: string): string {
  return assertNonBlank(paymentId, `${providerId}: paymentId`);
}

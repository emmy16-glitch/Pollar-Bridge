import { pgTable, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";

export const transfers = pgTable("transfers", {
  id: text("id").primaryKey(), // e.g. PB-NG-20481
  trackingToken: text("tracking_token").notNull().unique(),
  senderName: text("sender_name").notNull().default("Demo Sender"),
  senderEmail: text("sender_email").notNull().default("sender@pollarbridge.africa"),
  sourceCountry: text("source_country").notNull(), // Nigeria, Ghana, Kenya, South Africa
  sourceCurrency: text("source_currency").notNull(), // NGN, GHS, KES, ZAR
  destCountry: text("dest_country").notNull().default("Bolivia"),
  destCurrency: text("dest_currency").notNull().default("BOB"),
  sourceAmount: numeric("source_amount", { precision: 14, scale: 2 }).notNull(),
  providerFee: numeric("provider_fee", { precision: 14, scale: 2 }).notNull().default("0"),
  pollarFee: numeric("pollar_fee", { precision: 14, scale: 2 }).notNull().default("0"),
  totalSourceAmount: numeric("total_source_amount", { precision: 14, scale: 2 }).notNull(),
  usdcAmount: numeric("usdc_amount", { precision: 14, scale: 4 }).notNull(),
  estimatedBobPayout: numeric("estimated_bob_payout", { precision: 14, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 4 }).notNull(),
  selectedRailId: text("selected_rail_id").notNull(),
  railName: text("rail_name").notNull(),
  status: text("status").notNull().default("QUOTE_CREATED"), 
  // QUOTE_CREATED | INSTRUCTIONS_ISSUED | PAYMENT_DETECTED | IN_REVIEW | PAYMENT_VERIFIED | USDC_SETTLED | COMPLETED | REJECTED
  paymentReference: text("payment_reference").notNull(),
  recipientWalletAddress: text("recipient_wallet_address").notNull(),
  recipientName: text("recipient_name").notNull().default("Recipient in Bolivia"),
  paymentProofUrl: text("payment_proof_url"),
  operatorNotes: text("operator_notes"),
  pollarTxHash: text("pollar_tx_hash"),
  stellarLedger: text("stellar_ledger"),
  rateSource: text("rate_source").notNull().default("Simulated sandbox rate"),
  quoteExpiresAt: timestamp("quote_expires_at").notNull(),
  paidAt: timestamp("paid_at"),
  verifiedAt: timestamp("verified_at"),
  settledAt: timestamp("settled_at"),
  reconciled: boolean("reconciled").notNull().default(false),
  reconciliationNotes: text("reconciliation_notes"),
  actualPaidAmount: numeric("actual_paid_amount", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const corridors = pgTable("corridors", {
  id: text("id").primaryKey(), // NG-BOB, GH-BOB, KE-BOB, ZA-BOB
  fromCountry: text("from_country").notNull(),
  fromCode: text("from_code").notNull(),
  fromCurrency: text("from_currency").notNull(),
  toCountry: text("to_country").notNull().default("Bolivia"),
  toCode: text("to_code").notNull().default("BO"),
  toCurrency: text("to_currency").notNull().default("BOB"),
  usdcRate: numeric("usdc_rate", { precision: 14, scale: 4 }).notNull(), // units of source per USDC
  bobPerUsdc: numeric("bob_per_usdc", { precision: 14, scale: 4 }).notNull().default("6.96"),
  minAmount: numeric("min_amount", { precision: 14, scale: 2 }).notNull().default("5000"),
  maxAmount: numeric("max_amount", { precision: 14, scale: 2 }).notNull().default("5000000"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | COMING_SOON | MAINTENANCE
  description: text("description").notNull(),
  settlementSpeed: text("settlement_speed").notNull().default("10-20 min"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  corridorId: text("corridor_id").notNull(),
  railType: text("rail_type").notNull(), // Bank transfer | P2P Provider | Mobile money
  mode: text("mode").notNull().default("Sandbox"), // Sandbox | Live
  status: text("status").notNull().default("Healthy"), // Healthy | Degraded | Unavailable | Locked | Coming soon
  estimatedDelivery: text("estimated_delivery").notNull(),
  fixedFee: numeric("fixed_fee", { precision: 14, scale: 2 }).notNull().default("500"),
  percentFee: numeric("percent_fee", { precision: 6, scale: 4 }).notNull().default("0.005"),
  speedRank: text("speed_rank").notNull().default("Standard"), // Cheapest | Fastest | Standard
  verificationMethod: text("verification_method").notNull().default("Manual verification"),
  totalCalls: integer("total_calls").notNull().default(100),
  errorRate: numeric("error_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  lastHealthCheck: timestamp("last_health_check").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  transferId: text("transfer_id").notNull(),
  actor: text("actor").notNull(), // Sender | Operator | System | Pollar Engine
  action: text("action").notNull(), // QUOTE_GENERATED | PAYMENT_SUBMITTED | PAYMENT_VERIFIED | USDC_MINTED | SETTLEMENT_CONFIRMED | CORRIDOR_UPDATED
  details: text("details").notNull(),
  ipAddress: text("ip_address").default("127.0.0.1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const walletState = pgTable("wallet_state", {
  id: text("id").primaryKey().default("primary_pollar_wallet"),
  address: text("address").notNull(),
  usdcBalance: numeric("usdc_balance", { precision: 14, scale: 4 }).notNull().default("1500.00"),
  xlmBalance: numeric("xlm_balance", { precision: 14, scale: 4 }).notNull().default("25.50"),
  network: text("network").notNull().default("Stellar Testnet"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Transfer = typeof transfers.$inferSelect;
export type Corridor = typeof corridors.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type WalletState = typeof walletState.$inferSelect;

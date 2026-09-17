import { ProviderRegistry } from "./payments/providers/providerRegistry.js";
import { ProviderHealthTracker } from "./payments/providers/providerHealth.js";
import { MemoryStore } from "./store/memoryStore.js";
import { AuditLog } from "./store/auditLog.js";
import { QuoteService } from "./payments/orchestration/quoteService.js";
import { TransferService } from "./payments/orchestration/transferService.js";
import { SandboxAgentProvider } from "./payments/adapters/sandbox/SandboxAgentAdapter.js";
import { SandboxBankProvider } from "./payments/adapters/sandbox/SandboxBankAdapter.js";
import { SandboxMobileMoneyProvider } from "./payments/adapters/sandbox/SandboxMobileMoneyAdapter.js";
import { SandboxP2PProvider } from "./payments/adapters/sandbox/SandboxP2PAdapter.js";

export interface Container {
  registry: ProviderRegistry;
  store: MemoryStore;
  audit: AuditLog;
  health: ProviderHealthTracker;
  quotes: QuoteService;
  transfers: TransferService;
  sandboxBank: SandboxBankProvider;
  sandboxMomo: SandboxMobileMoneyProvider;
  sandboxP2p: SandboxP2PProvider;
  sandboxAgent: SandboxAgentProvider;
  ghBank: SandboxBankProvider;
  keMomo: SandboxMobileMoneyProvider;
  zaBank: SandboxBankProvider;
  zaP2p: SandboxP2PProvider;
}

export function buildContainer(): Container {
  const registry = new ProviderRegistry();
  const store = new MemoryStore();
  const audit = new AuditLog();
  const health = new ProviderHealthTracker();
  const quotes = new QuoteService();

  // Primary demo rails (enabled corridors)
  const sandboxBank = new SandboxBankProvider("ng-demo-bank", "NGN");
  const sandboxMomo = new SandboxMobileMoneyProvider("gh-demo-momo", "GHS");
  const sandboxP2p = new SandboxP2PProvider("ng-demo-p2p", "NGN");
  const sandboxAgent = new SandboxAgentProvider("ke-demo-agent", "KES");
  // Config-first expansion (§19): named handles so operator simulate/verify
  // works for every corridor, not just the first four.
  const ghBank = new SandboxBankProvider("gh-demo-bank", "GHS");
  const keMomo = new SandboxMobileMoneyProvider("ke-demo-momo", "KES");
  const zaBank = new SandboxBankProvider("za-demo-bank", "ZAR");
  const zaP2p = new SandboxP2PProvider("za-demo-p2p", "ZAR");

  registry.register({ countryCode: "NG", rail: "bank_transfer", mode: "sandbox", adapter: sandboxBank });
  registry.register({ countryCode: "NG", rail: "p2p", mode: "sandbox", adapter: sandboxP2p });
  registry.register({ countryCode: "GH", rail: "mobile_money", mode: "sandbox", adapter: sandboxMomo });
  // Config-first expansion (§19): registered so capability matrix reports
  // "disabled" (corridor off) instead of "coming_soon" (no code behind it).
  registry.register({ countryCode: "GH", rail: "bank_transfer", mode: "sandbox", adapter: ghBank });
  registry.register({ countryCode: "KE", rail: "mobile_money", mode: "sandbox", adapter: keMomo });
  registry.register({ countryCode: "KE", rail: "agent", mode: "sandbox", adapter: sandboxAgent });
  registry.register({ countryCode: "ZA", rail: "bank_transfer", mode: "sandbox", adapter: zaBank });
  registry.register({ countryCode: "ZA", rail: "p2p", mode: "sandbox", adapter: zaP2p });

  const transfers = new TransferService(registry, store, quotes);
  return { registry, store, audit, health, quotes, transfers, sandboxBank, sandboxMomo, sandboxP2p, sandboxAgent, ghBank, keMomo, zaBank, zaP2p };
}

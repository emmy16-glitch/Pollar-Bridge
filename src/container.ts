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

  registry.register({ countryCode: "NG", rail: "bank_transfer", mode: "sandbox", adapter: sandboxBank });
  registry.register({ countryCode: "NG", rail: "p2p", mode: "sandbox", adapter: sandboxP2p });
  registry.register({ countryCode: "GH", rail: "mobile_money", mode: "sandbox", adapter: sandboxMomo });
  // Config-first expansion (§19): registered so capability matrix reports
  // "disabled" (corridor off) instead of "coming_soon" (no code behind it).
  registry.register({ countryCode: "GH", rail: "bank_transfer", mode: "sandbox", adapter: new SandboxBankProvider("gh-demo-bank", "GHS") });
  registry.register({ countryCode: "KE", rail: "mobile_money", mode: "sandbox", adapter: new SandboxMobileMoneyProvider("ke-demo-momo", "KES") });
  registry.register({ countryCode: "KE", rail: "agent", mode: "sandbox", adapter: sandboxAgent });
  registry.register({ countryCode: "ZA", rail: "bank_transfer", mode: "sandbox", adapter: new SandboxBankProvider("za-demo-bank", "ZAR") });
  registry.register({ countryCode: "ZA", rail: "p2p", mode: "sandbox", adapter: new SandboxP2PProvider("za-demo-p2p", "ZAR") });

  const transfers = new TransferService(registry, store, quotes);
  return { registry, store, audit, health, quotes, transfers, sandboxBank, sandboxMomo, sandboxP2p, sandboxAgent };
}

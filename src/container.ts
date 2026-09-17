import { ProviderRegistry } from "./payments/providers/providerRegistry.js";
import { MemoryStore } from "./store/memoryStore.js";
import { QuoteService } from "./payments/orchestration/quoteService.js";
import { TransferService } from "./payments/orchestration/transferService.js";
import { SandboxBankProvider } from "./payments/adapters/sandbox/SandboxBankAdapter.js";
import { SandboxMobileMoneyProvider } from "./payments/adapters/sandbox/SandboxMobileMoneyAdapter.js";
import { SandboxP2PProvider } from "./payments/adapters/sandbox/SandboxP2PAdapter.js";

export interface Container {
  registry: ProviderRegistry;
  store: MemoryStore;
  quotes: QuoteService;
  transfers: TransferService;
  sandboxBank: SandboxBankProvider;
  sandboxMomo: SandboxMobileMoneyProvider;
  sandboxP2p: SandboxP2PProvider;
}

export function buildContainer(): Container {
  const registry = new ProviderRegistry();
  const store = new MemoryStore();
  const quotes = new QuoteService();

  const sandboxBank = new SandboxBankProvider();
  const sandboxMomo = new SandboxMobileMoneyProvider();
  const sandboxP2p = new SandboxP2PProvider();

  registry.register({ countryCode: "NG", rail: "bank_transfer", mode: "sandbox", adapter: sandboxBank });
  registry.register({ countryCode: "NG", rail: "p2p", mode: "sandbox", adapter: sandboxP2p });
  registry.register({ countryCode: "GH", rail: "mobile_money", mode: "sandbox", adapter: sandboxMomo });

  const transfers = new TransferService(registry, store, quotes);
  return { registry, store, quotes, transfers, sandboxBank, sandboxMomo, sandboxP2p };
}

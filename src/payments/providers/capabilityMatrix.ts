import type { RailAvailability } from "../../types.js";
import { listCorridors } from "../corridors/corridorRegistry.js";
import type { ProviderRegistry } from "./providerRegistry.js";

// Layer 5: availability = config AND real adapter capabilities. Never config alone.
export function buildCapabilityMatrix(registry: ProviderRegistry): RailAvailability[] {
  return listCorridors().map((c) => {
    try {
      const adapter = registry.resolveById(c.providerId);
      const capabilities = adapter.capabilities();
      const canExecute = capabilities.paymentCreation && (capabilities.manualVerification || capabilities.automatedSettlement || capabilities.webhooks || capabilities.statusPolling);
      return {
        country: c.sourceCountry,
        rail: c.sourceRail,
        provider: c.providerId,
        mode: c.mode,
        capabilities,
        status: !c.enabled ? "disabled" : canExecute ? (capabilities.automatedSettlement ? "available" : "manual") : "coming_soon",
      } satisfies RailAvailability;
    } catch {
      return {
        country: c.sourceCountry,
        rail: c.sourceRail,
        provider: c.providerId,
        mode: c.mode,
        capabilities: {
          quotes: false,
          paymentCreation: false,
          webhooks: false,
          statusPolling: false,
          refunds: false,
          automatedSettlement: false,
          manualVerification: false,
        },
        status: "coming_soon",
      } satisfies RailAvailability;
    }
  });
}

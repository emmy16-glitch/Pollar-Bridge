import type { RailType, RuntimeMode } from "../../types.js";
import type { LocalRailProvider } from "../adapters/LocalRailProvider.js";

interface Registration {
  countryCode: string;
  rail: RailType;
  mode: RuntimeMode;
  adapter: LocalRailProvider;
}

// Layer 4: resolves provider by country + rail + mode. No scattered if(country).
export class ProviderRegistry {
  private providers: Registration[] = [];

  register(reg: Registration): void {
    this.providers.push({
      ...reg,
      countryCode: reg.countryCode.toUpperCase(),
    });
  }

  resolve(countryCode: string, rail: RailType, mode: RuntimeMode): LocalRailProvider {
    const found = this.providers.find(
      (p) => p.countryCode === countryCode.toUpperCase() && p.rail === rail && p.mode === mode,
    );
    if (!found) throw new Error("No provider configured for this corridor");
    return found.adapter;
  }

  resolveById(providerId: string): LocalRailProvider {
    const found = this.providers.find((p) => p.adapter.providerId === providerId);
    if (!found) throw new Error(`No provider registered: ${providerId}`);
    return found.adapter;
  }

  list(): { countryCode: string; rail: RailType; mode: RuntimeMode; providerId: string }[] {
    return this.providers.map((p) => ({
      countryCode: p.countryCode,
      rail: p.rail,
      mode: p.mode,
      providerId: p.adapter.providerId,
    }));
  }
}

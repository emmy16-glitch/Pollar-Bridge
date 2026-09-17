import type { CountryConfig } from "../../types.js";
import { ghanaConfig } from "./ghana.js";
import { kenyaConfig } from "./kenya.js";
import { nigeriaConfig } from "./nigeria.js";
import { southAfricaConfig } from "./southAfrica.js";

const registry = new Map<string, CountryConfig>([
  [nigeriaConfig.countryCode, nigeriaConfig],
  [ghanaConfig.countryCode, ghanaConfig],
  [kenyaConfig.countryCode, kenyaConfig],
  [southAfricaConfig.countryCode, southAfricaConfig],
]);

export function getCountry(code: string): CountryConfig {
  const c = registry.get(code.toUpperCase());
  if (!c) throw new Error(`Unknown country: ${code}`);
  return c;
}

export function listCountries(): CountryConfig[] {
  return [...registry.values()];
}

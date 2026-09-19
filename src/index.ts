import "dotenv/config";
import { buildApp } from "./app.js";
import { buildContainer } from "./container.js";
import { seedDemoData, shouldAutoSeed } from "./seed.js";

const port = Number(process.env.PORT ?? 4000);
const container = buildContainer();
const app = buildApp(container);

if (shouldAutoSeed()) {
  seedDemoData(container).then(
    (r) => {
      if (r.seeded) console.log(`demo seed: created ${r.transferIds.length} demo transfers`);
    },
    (e) => console.error("demo seed failed:", e instanceof Error ? e.message : e),
  );
}

app.listen(port, () => {
  console.log(`pollar-bridge-backend listening on :${port} (pollarEnv=${process.env.POLLAR_ENV ?? "testnet"})`);
});

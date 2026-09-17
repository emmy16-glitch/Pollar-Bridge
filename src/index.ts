import "dotenv/config";
import { buildApp } from "./app.js";
import { buildContainer } from "./container.js";

const port = Number(process.env.PORT ?? 4000);
const container = buildContainer();
const app = buildApp(container);

app.listen(port, () => {
  console.log(`pollar-bridge-backend listening on :${port} (pollarEnv=${process.env.POLLAR_ENV ?? "testnet"})`);
});

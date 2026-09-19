// Vercel serverless entry for the PollarBridge Express backend.
// Reuses the exact same app as `npm run dev`/`npm start` (src/app.ts buildApp)
// so local, tests, and production all run the same code. The app instance is
// cached per warm lambda instance; the in-memory store lives with it.
// NOTE: imports from ../src (not dist/) — Vercel compiles TS from source and
// dist/ is gitignored so it never reaches the deployment upload.
import { buildApp } from "../src/app.js";
import { buildContainer } from "../src/container.js";
import { seedDemoData, shouldAutoSeed } from "../src/seed.js";

let cachedApp = null;

export default async function handler(req, res) {
  if (!cachedApp) {
    const container = buildContainer();
    if (shouldAutoSeed()) {
      try {
        await seedDemoData(container);
      } catch (e) {
        console.error("demo seed failed:", e?.message ?? e);
      }
    }
    cachedApp = buildApp(container);
  }
  return cachedApp(req, res);
}

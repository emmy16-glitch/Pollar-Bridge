import cors from "cors";
import express from "express";
import type { Container } from "./container.js";
import { agentRoutes } from "./routes/agent.js";
import { corridorRoutes } from "./routes/corridors.js";
import { demoRoutes } from "./routes/demo.js";
import { extraRoutes } from "./routes/extra.js";
import { healthRoutes } from "./routes/health.js";
import { operatorRoutes } from "./routes/operator.js";
import { pollerRoutes } from "./routes/pollar.js";
import { quoteRoutes } from "./routes/quotes.js";
import { transferRoutes } from "./routes/transfers.js";
import { redactSecrets } from "./security.js";

export function buildApp(c: Container): express.Express {
  const app = express();
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowed.length > 0 ? allowed : true,
      exposedHeaders: ["X-Request-Id"],
    }),
  );
  // Stash the raw JSON body for HMAC webhook verification (live mode).
  // JSON.stringify(req.body) is NOT byte-identical to what providers sign.
  app.use(
    express.json({
      limit: "100kb",
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    }),
  );

  // Minimal security headers (no extra deps) + request id.
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    (req as unknown as { id: string }).id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    next();
  });

  // Never log secrets: redact keys/tokens/secrets from URL + auth headers.
  app.use((req, _res, next) => {
    const url = redactSecrets(req.url);
    const opKey = req.header("x-operator-key") ? " [operator-key present]" : "";
    const authz = req.header("authorization") ? " [authorization present]" : "";
    console.log(`${req.method} ${url}${opKey}${authz}`);
    next();
  });

  const api = express.Router();
  api.use(healthRoutes());
  api.use(corridorRoutes(c));
  api.use(quoteRoutes(c));
  api.use(transferRoutes(c));
  api.use(operatorRoutes(c));
  api.use(extraRoutes(c));
  api.use(pollerRoutes(c));
  api.use(agentRoutes(c));
  api.use(demoRoutes(c));
  app.use("/api", api);

  app.get("/", (_req, res) =>
    res.json({ service: "pollar-bridge-backend", docs: "/api/health" }),
  );

  // Central error fallback (no stack / secret leakage).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("unhandled error");
    void err;
    res.status(500).json({ error: "internal error" });
  });

  return app;
}

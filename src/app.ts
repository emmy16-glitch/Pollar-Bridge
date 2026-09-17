import cors from "cors";
import express from "express";
import type { Container } from "./container.js";
import { corridorRoutes } from "./routes/corridors.js";
import { extraRoutes } from "./routes/extra.js";
import { healthRoutes } from "./routes/health.js";
import { operatorRoutes } from "./routes/operator.js";
import { quoteRoutes } from "./routes/quotes.js";
import { transferRoutes } from "./routes/transfers.js";

export function buildApp(c: Container): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Never log secrets: redact common secret substrings.
  app.use((req, _res, next) => {
    const url = req.url.replace(/(api[_-]?key|token|secret)=[^&]+/gi, "$1=[redacted]");
    console.log(`${req.method} ${url}`);
    next();
  });

  const api = express.Router();
  api.use(healthRoutes());
  api.use(corridorRoutes(c));
  api.use(quoteRoutes(c));
  api.use(transferRoutes(c));
  api.use(operatorRoutes(c));
  api.use(extraRoutes(c));
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

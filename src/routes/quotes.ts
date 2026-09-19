import { Router } from "express";
import { z } from "zod";
import type { Container } from "../container.js";

const quoteSchema = z.object({
  corridorId: z.string().min(3),
  sourceAmount: z.number().finite().positive(),
});

export function quoteRoutes(c: Container): Router {
  const r = Router();
  const handler = (req: { body: unknown }, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
    try {
      const body = quoteSchema.parse(req.body);
      const q = c.quotes.createQuote(body);
      c.store.saveQuote(q);
      res.status(201).json(q);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  };
  // User-facing word is "estimate"; /quotes kept as a backward-compatible alias.
  r.post("/estimates", handler as never);
  r.post("/quotes", handler as never);
  return r;
}

import { Router } from "express";
import { z } from "zod";
import type { Container } from "../container.js";

const quoteSchema = z.object({
  corridorId: z.string().min(3),
  sourceAmount: z.number().positive(),
});

export function quoteRoutes(c: Container): Router {
  const r = Router();
  r.post("/quotes", (req, res) => {
    try {
      const body = quoteSchema.parse(req.body);
      const q = c.quotes.createQuote(body);
      c.store.saveQuote(q);
      res.status(201).json(q);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : "bad request" });
    }
  });
  return r;
}

import { z } from "zod";
import { heuristicNames } from "./types.js";

const score = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

export const qaMissionSchema = z.object({
  id: z.string().regex(/^MISSION-[A-Z0-9-]+$/),
  title: z.string().min(5),
  module: z.string().min(2),
  charter: z.string().min(10),
  persona: z.string().min(2),
  timeboxMinutes: z.number().int().min(5).max(180).default(45),
  heuristics: z.array(z.enum(heuristicNames)).min(1),
  oracles: z.array(z.enum([
    "ui",
    "network",
    "persistence",
    "search-table",
    "console",
    "blueprint",
    "accessibility",
    "performance"
  ])).min(1),
  risks: z.array(z.object({
    id: z.string().min(2),
    description: z.string().min(5),
    likelihood: score,
    impact: score,
    evidence: z.array(z.string()).default([])
  })).default([]),
  steps: z.array(z.object({
    id: z.string().min(2),
    phase: z.enum(["given", "when", "then"]),
    instruction: z.string().min(3),
    actionRef: z.string().min(2).optional(),
    expected: z.string().min(3).optional()
  })).min(1)
});

import fs from "node:fs";
import path from "node:path";
import type { CleanupResult, EntityRegistryEntry } from "./types.js";

export class EntityRegistry {
  private readonly entries: EntityRegistryEntry[] = [];

  constructor(
    private readonly runId: string,
    private readonly outputPath = path.join(process.cwd(), "artifacts", "state", `${runId}-entities.json`)
  ) {}

  add(entry: Omit<EntityRegistryEntry, "runId">): EntityRegistryEntry {
    const complete = { ...entry, runId: this.runId };
    this.entries.push(complete);
    this.persist();
    return complete;
  }

  update(identifier: string, patch: Partial<EntityRegistryEntry>): void {
    const entry = this.entries.find((candidate) => candidate.uiIdentifier === identifier);
    if (!entry) return;
    Object.assign(entry, patch);
    this.persist();
  }

  all(): EntityRegistryEntry[] {
    return structuredClone(this.entries);
  }

  reconcile(): CleanupResult[] {
    return this.entries.map((entity) => ({
      entity,
      status: entity.retainedForFinding || entity.createdByRun ? "Retained" : "Restored",
      detail: entity.retainedForFinding
        ? `Retained for finding ${entity.retainedForFinding}.`
        : entity.createdByRun
          ? "Delete is disabled; QA-prefixed fixture retained and recorded."
          : "Original state restored."
    }));
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    fs.writeFileSync(this.outputPath, `${JSON.stringify(this.entries, null, 2)}\n`);
  }
}

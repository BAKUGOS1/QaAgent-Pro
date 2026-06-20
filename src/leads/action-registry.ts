import type { Page } from "@playwright/test";

export type DeterministicAction = (page: Page) => Promise<void>;

export class DeterministicActionRegistry {
  private readonly actions = new Map<string, DeterministicAction>();

  register(name: string, action: DeterministicAction): void {
    if (!/^[a-z]+(?:[.-][a-z0-9]+)+$/.test(name)) throw new Error(`Invalid deterministic action name: ${name}`);
    if (this.actions.has(name)) throw new Error(`Action already registered: ${name}`);
    this.actions.set(name, action);
  }

  has(name: string): boolean {
    return this.actions.has(name);
  }

  async execute(name: string, page: Page): Promise<void> {
    const action = this.actions.get(name);
    if (!action) throw new Error(`Unsupported deterministic action: ${name}`);
    await action(page);
  }

  names(): string[] {
    return [...this.actions.keys()].sort();
  }
}

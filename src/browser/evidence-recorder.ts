import type { ConsoleMessage, Page, Request, Response } from "@playwright/test";
import { redactText } from "../shared/redaction.js";

export interface NetworkEvidence {
  method: string;
  url: string;
  status?: number;
  failure?: string;
  durationMs?: number;
  matchedAction?: string;
}

export interface BrowserEvidence {
  consoleErrors: string[];
  pageErrors: string[];
  network: NetworkEvidence[];
}

export class EvidenceRecorder {
  private readonly evidence: BrowserEvidence = {
    consoleErrors: [],
    pageErrors: [],
    network: []
  };

  constructor(private readonly secrets: string[] = []) {}

  attach(page: Page): void {
    page.on("console", (message) => this.recordConsole(message));
    page.on("pageerror", (error) => {
      this.evidence.pageErrors.push(redactText(error.message, this.secrets));
    });
    page.on("response", (response) => this.recordResponse(response));
    page.on("requestfailed", (request) => this.recordFailedRequest(request));
  }

  snapshot(): BrowserEvidence {
    return structuredClone(this.evidence);
  }

  mark(): BrowserEvidence {
    return {
      consoleErrors: [...this.evidence.consoleErrors],
      pageErrors: [...this.evidence.pageErrors],
      network: [...this.evidence.network]
    };
  }

  since(mark: BrowserEvidence): BrowserEvidence {
    return {
      consoleErrors: this.evidence.consoleErrors.slice(mark.consoleErrors.length),
      pageErrors: this.evidence.pageErrors.slice(mark.pageErrors.length),
      network: this.evidence.network.slice(mark.network.length)
    };
  }

  private recordConsole(message: ConsoleMessage): void {
    if (message.type() === "error") {
      this.evidence.consoleErrors.push(redactText(message.text(), this.secrets));
    }
  }

  private recordResponse(response: Response): void {
    const resourceType = response.request().resourceType();
    if (resourceType !== "xhr" && resourceType !== "fetch") return;
    this.evidence.network.push({
      method: response.request().method(),
      url: sanitizeUrl(response.url(), this.secrets),
      status: response.status()
    });
  }

  private recordFailedRequest(request: Request): void {
    this.evidence.network.push({
      method: request.method(),
      url: sanitizeUrl(request.url(), this.secrets),
      failure: redactText(request.failure()?.errorText ?? "Request failed", this.secrets)
    });
  }
}

export function sanitizeUrl(value: string, secrets: string[] = []): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (/password|token|secret|key|auth/i.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    return redactText(url.toString(), secrets);
  } catch {
    return redactText(value, secrets);
  }
}

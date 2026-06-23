import type { Page, Request, Response } from "@playwright/test";
import type { NetworkEvidence } from "./evidence-recorder.js";
import { sanitizeUrl } from "./evidence-recorder.js";
import { redactText } from "../shared/redaction.js";

export interface ExpectedNetworkAction {
  actionName: string;
  urlPattern: RegExp;
  methods: string[];
  expectedStatusMin: number;
  expectedStatusMax: number;
  timeoutMs: number;
  excludeUrlPattern?: RegExp;
}

export interface MatchedNetworkEvidence extends NetworkEvidence {
  actionName: string;
  matched: boolean;
  durationMs: number;
  error?: string;
}

export function networkEvidenceMatches(
  evidence: Pick<NetworkEvidence, "method" | "url" | "status" | "failure">,
  expectation: ExpectedNetworkAction
): boolean {
  const method = evidence.method.toUpperCase();
  return expectation.methods.map((item) => item.toUpperCase()).includes(method)
    && expectation.urlPattern.test(evidence.url)
    && !(expectation.excludeUrlPattern?.test(evidence.url) ?? false);
}

export function networkEvidenceSucceeded(
  evidence: Pick<NetworkEvidence, "status">,
  expectation: ExpectedNetworkAction
): boolean {
  return typeof evidence.status === "number"
    && evidence.status >= expectation.expectedStatusMin
    && evidence.status <= expectation.expectedStatusMax;
}

export async function captureActionNetwork(
  page: Page,
  expectation: ExpectedNetworkAction,
  action: () => Promise<void>,
  secrets: string[] = []
): Promise<MatchedNetworkEvidence> {
  const started = Date.now();
  const responsePromise = page.waitForResponse(
    (response) => responseMatches(response, expectation),
    { timeout: expectation.timeoutMs }
  ).then((response) => networkFromResponse(response, expectation, started, secrets)).catch(() => undefined);
  const failedPromise = page.waitForEvent(
    "requestfailed",
    {
      predicate: (request) => requestMatches(request, expectation),
      timeout: expectation.timeoutMs
    }
  ).then((request) => networkFromFailedRequest(request, expectation, started, secrets)).catch(() => undefined);
  const timeoutPromise = delay(expectation.timeoutMs).then(() => undefined);

  await action();
  return (await Promise.race([responsePromise, failedPromise, timeoutPromise])) ?? {
    actionName: expectation.actionName,
    matched: false,
    method: expectation.methods.join("|"),
    url: expectation.urlPattern.source,
    durationMs: Date.now() - started,
    error: `No ${expectation.actionName} network request matched within ${expectation.timeoutMs}ms.`
  };
}

function responseMatches(response: Response, expectation: ExpectedNetworkAction): boolean {
  return requestMatches(response.request(), expectation);
}

function requestMatches(request: Request, expectation: ExpectedNetworkAction): boolean {
  return networkEvidenceMatches({
    method: request.method(),
    url: request.url()
  }, expectation);
}

function networkFromResponse(
  response: Response,
  expectation: ExpectedNetworkAction,
  started: number,
  secrets: string[]
): MatchedNetworkEvidence {
  const evidence = {
    actionName: expectation.actionName,
    matched: true,
    matchedAction: expectation.actionName,
    method: response.request().method(),
    url: sanitizeUrl(response.url(), secrets),
    status: response.status(),
    durationMs: Date.now() - started
  };
  return evidence;
}

function networkFromFailedRequest(
  request: Request,
  expectation: ExpectedNetworkAction,
  started: number,
  secrets: string[]
): MatchedNetworkEvidence {
  return {
    actionName: expectation.actionName,
    matched: true,
    matchedAction: expectation.actionName,
    method: request.method(),
    url: sanitizeUrl(request.url(), secrets),
    failure: redactText(request.failure()?.errorText ?? "Request failed", secrets),
    durationMs: Date.now() - started
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

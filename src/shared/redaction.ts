const sensitiveKeyPattern = /authorization|cookie|password|passwd|secret|token|api[-_]?key|session/i;
const sensitiveQueryPattern = /([?&](?:password|token|access_token|refresh_token|api_key|secret)=)[^&#\s]*/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export const REDACTED = "[REDACTED]";

export function redactText(value: string, secrets: string[] = []): string {
  let redacted = value
    .replace(sensitiveQueryPattern, `$1${REDACTED}`)
    .replace(bearerPattern, `Bearer ${REDACTED}`)
    .replace(jwtPattern, REDACTED);

  for (const secret of secrets.filter((entry) => entry.length > 0)) {
    redacted = redacted.split(secret).join(REDACTED);
  }
  return redacted;
}

export function redactValue(value: unknown, secrets: string[] = []): unknown {
  if (typeof value === "string") return redactText(value, secrets);
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, secrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKeyPattern.test(key) ? REDACTED : redactValue(entry, secrets)
      ])
    );
  }
  return value;
}

export function redactHeaders(
  headers: Record<string, string | string[] | undefined>,
  secrets: string[] = []
): Record<string, string | string[]> {
  const redacted: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (sensitiveKeyPattern.test(key)) {
      redacted[key] = REDACTED;
    } else if (typeof value === "string") {
      redacted[key] = redactText(value, secrets);
    } else {
      redacted[key] = value.map((entry) => redactText(entry, secrets));
    }
  }
  return redacted;
}

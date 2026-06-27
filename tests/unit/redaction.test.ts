import { describe, expect, test } from "vitest";
import { REDACTED, redactText, redactValue, redactHeaders } from "../../src/shared/redaction.js";

describe("secret redaction", () => {
  test("redacts nested sensitive keys", () => {
    expect(redactValue({
      headers: { authorization: "Bearer abc", cookie: "sid=123" },
      user: { password: "secret", name: "QA" }
    })).toEqual({
      headers: { authorization: REDACTED, cookie: REDACTED },
      user: { password: REDACTED, name: "QA" }
    });
  });

  test("redacts URL query values, bearer tokens, JWTs, and supplied secrets", () => {
    const value = "https://x.test?a=1&token=abc Bearer xyz eyJaaa.bbb.ccc password-value";
    const result = redactText(value, ["password-value"]);
    expect(result).not.toContain("abc");
    expect(result).not.toContain("xyz");
    expect(result).not.toContain("eyJaaa");
    expect(result).not.toContain("password-value");
    expect(result).toContain(REDACTED);
  });
});

describe("redactHeaders", () => {
  test("redacts sensitive header keys", () => {
    const result = redactHeaders({
      authorization: "Bearer secret-token",
      cookie: "session=abc123",
      "content-type": "application/json"
    });
    expect(result.authorization).toBe(REDACTED);
    expect(result.cookie).toBe(REDACTED);
    expect(result["content-type"]).toBe("application/json");
  });

  test("redacts custom secrets from non-sensitive header values", () => {
    const result = redactHeaders(
      { "x-custom": "my-secret-value is here" },
      ["my-secret-value"]
    );
    expect(result["x-custom"]).not.toContain("my-secret-value");
  });

  test("handles array header values", () => {
    const result = redactHeaders({
      authorization: ["Bearer a", "Bearer b"],
      "x-forwarded-for": ["1.2.3.4", "5.6.7.8"]
    });
    expect(result.authorization).toBe(REDACTED);
    expect(result["x-forwarded-for"]).toEqual(["1.2.3.4", "5.6.7.8"]);
  });

  test("skips undefined values", () => {
    const result = redactHeaders({
      "x-present": "yes",
      "x-missing": undefined
    });
    expect(Object.keys(result)).toEqual(["x-present"]);
    expect(result["x-present"]).toBe("yes");
  });
});


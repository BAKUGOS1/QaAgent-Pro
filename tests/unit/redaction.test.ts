import { describe, expect, test } from "vitest";
import { REDACTED, redactText, redactValue } from "../../src/shared/redaction.js";

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

import { describe, expect, test } from "vitest";
import { parseConfig } from "../../src/config/load.js";
import { authorizeAction } from "../../src/safety/policy.js";
import type { EnvironmentDecision } from "../../src/safety/environment-guard.js";

const permittedEnvironment: EnvironmentDecision = {
  access: "mutation-allowed",
  checks: {
    stagingEnvironment: true,
    hostnameAllowlisted: true,
    tenantAllowlisted: true,
    qaAccountAllowlisted: true,
    visibleStagingMarker: true
  },
  reasons: []
};

const deniedEnvironment: EnvironmentDecision = {
  ...permittedEnvironment,
  access: "read-only",
  reasons: ["Tenant is not verified."]
};

describe("safety policy", () => {
  test("always permits reads", () => {
    expect(authorizeAction("read", parseConfig({}), deniedEnvironment).allowed).toBe(true);
  });

  test("blocks every mutation when environment verification fails", () => {
    const config = parseConfig({ ALLOW_ARCHIVE: "true", ALLOW_DELETE: "true", ALLOW_DESTRUCTIVE: "true" });
    expect(authorizeAction("create", config, deniedEnvironment).allowed).toBe(false);
    expect(authorizeAction("archive", config, deniedEnvironment).allowed).toBe(false);
    expect(authorizeAction("delete", config, deniedEnvironment).allowed).toBe(false);
  });

  test("requires explicit archive policy", () => {
    expect(authorizeAction("archive", parseConfig({}), permittedEnvironment).allowed).toBe(false);
    expect(authorizeAction("archive", parseConfig({ ALLOW_ARCHIVE: "true" }), permittedEnvironment).allowed).toBe(true);
  });

  test("requires both delete flags", () => {
    expect(authorizeAction("delete", parseConfig({ ALLOW_DELETE: "true" }), permittedEnvironment).allowed).toBe(false);
    const config = parseConfig({ ALLOW_DELETE: "true", ALLOW_DESTRUCTIVE: "true" });
    expect(authorizeAction("delete", config, permittedEnvironment)).toMatchObject({
      allowed: true,
      mode: "destructive-staging"
    });
  });

  test("blocks real messages and sensitive exports by default", () => {
    expect(authorizeAction("real-message", parseConfig({}), permittedEnvironment).allowed).toBe(false);
    expect(authorizeAction("sensitive-export", parseConfig({}), permittedEnvironment).allowed).toBe(false);
  });
});

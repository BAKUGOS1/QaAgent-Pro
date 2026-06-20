import { describe, expect, test } from "vitest";
import { verifyProductInputs } from "../../scripts/verify-product-inputs.js";

describe("product input manifest", () => {
  test("matches the approved checksums", () => {
    expect(verifyProductInputs()).toEqual([]);
  });
});

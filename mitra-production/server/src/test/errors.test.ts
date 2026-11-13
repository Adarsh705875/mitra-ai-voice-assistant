import { describe, expect, it } from "vitest";
import { isRetryable, normalizeProviderError } from "../errors";

describe("provider error handling", () => {
  it("retries transient provider errors", () => {
    expect(isRetryable(new Error("Mistral 429"))).toBe(true);
    expect(isRetryable(new Error("Gemini 401"))).toBe(false);
  });
  it("normalizes rate limit failures without exposing provider details", () => {
    const error = normalizeProviderError(new Error("Mistral 429: secret"));
    expect(error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(error.message).not.toContain("secret");
  });
});

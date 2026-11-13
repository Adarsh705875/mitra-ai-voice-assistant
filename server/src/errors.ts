export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function normalizeProviderError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : "Provider request failed";
  if (message.includes("401") || message.includes("403")) return new AppError("PROVIDER_AUTH", "AI provider credentials were rejected.", 502);
  if (message.includes("404")) return new AppError("PROVIDER_MODEL", "The configured AI model is unavailable.", 502);
  if (message.includes("429")) return new AppError("PROVIDER_UNAVAILABLE", "AI provider is busy. Try again shortly.", 503);
  return new AppError("PROVIDER_UNAVAILABLE", "AI providers are temporarily unavailable.", 503);
}

export function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : "";
  return /429|500|502|503|504|408|fetch failed|network|timeout/i.test(msg);
}

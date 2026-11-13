import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "passwordHash", "apiKey", "token"],
    censor: "[REDACTED]"
  },
  base: { service: "mitra-api" }
});

import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  COOKIE_SECURE: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODELS: z.string().default("gemini-2.5-flash,gemini-2.5-flash-lite"),
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().default("mistral-small-latest"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default("pNInz6obpgDQGcFmaJgB")
});

export const env = schema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
export const cookieSecure = env.COOKIE_SECURE === "true" || isProduction;

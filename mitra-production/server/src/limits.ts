import { rateLimit } from "express-rate-limit";
import Redis from "ioredis";
import { env } from "./config";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 250, 2000)
});

redis.on("error", (err) => logger.error({ err }, "Redis connection error"));

class RedisWindowStore {
  windowMs: number;
  prefix: string;
  constructor(windowMs: number, prefix: string) {
    this.windowMs = windowMs;
    this.prefix = prefix;
  }
  async increment(key: string) {
    const redisKey = `${this.prefix}:${key}`;
    const multi = redis.multi();
    multi.incr(redisKey);
    multi.pexpire(redisKey, this.windowMs, "NX");
    const result = await multi.exec();
    const total = Number(result?.[0]?.[1] ?? 0);
    return { totalHits: total, resetTime: new Date(Date.now() + this.windowMs) };
  }
  async decrement(key: string) { await redis.decr(`${this.prefix}:${key}`); }
  async resetKey(key: string) { await redis.del(`${this.prefix}:${key}`); }
}

export function buildLimiter(windowMs: number, limit: number, prefix: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => req.userId || req.ip || "unknown",
    store: new RedisWindowStore(windowMs, prefix) as any,
    handler: (_req, res) => res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Please wait and try again." } })
  });
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env, isProduction } from "./config";
import { logger } from "./logger";
import { prisma } from "./db";
import { redis } from "./limits";
import { router } from "./routes";
import { AppError } from "./errors";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== env.CLIENT_ORIGIN) return res.status(403).json({ error: { code: "ORIGIN_REJECTED", message: "Origin not allowed." } });
  next();
});
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
});
app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: (req as Request).requestId }) }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: "ok", database: "ok", cache: "ok" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.use("/api", router);

if (isProduction) {
  const clientDist = path.resolve(process.cwd(), "../client/dist");
  app.use(express.static(clientDist, { maxAge: "1h", index: false }));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof AppError ? err : new AppError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
  logger.error({ err, requestId: req.requestId, code: error.code }, "Request failed");
  if (res.headersSent) return res.end();
  res.status(error.status).json({ error: { code: error.code, message: error.message, requestId: req.requestId } });
});

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "Mitra API listening"));
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  await redis.quit().catch(() => undefined);
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

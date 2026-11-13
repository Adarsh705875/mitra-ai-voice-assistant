import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env, cookieSecure } from "./config";
import { AppError } from "./errors";

const COOKIE = "mitra_session";

export function setSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d", issuer: "mitra-api", audience: "mitra-web" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { httpOnly: true, secure: cookieSecure, sameSite: "lax", path: "/" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new AppError("AUTH_REQUIRED", "Please log in to continue.", 401);
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: "mitra-api", audience: "mitra-web" }) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.sub !== "string") throw new Error("Invalid token");
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError("AUTH_INVALID", "Your session is invalid or expired. Please log in again.", 401));
  }
}

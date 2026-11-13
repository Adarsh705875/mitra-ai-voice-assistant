import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";
import { AppError } from "./errors";
import { clearSession, requireAuth, setSession } from "./auth";
import { authLimiter, buildLimiter } from "./limits";
import { generateReply, streamReply } from "./providers";
import { env } from "./config";

export const router = Router();
const credentials = z.object({
  email: z.string().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128)
});

function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };
}

router.post("/auth/register", authLimiter, asyncRoute(async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Use a valid email and a password of at least 10 characters.", 400);
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) throw new AppError("EMAIL_EXISTS", "An account with this email already exists.", 409);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({ data: { email: parsed.data.email, passwordHash }, select: { id: true, email: true } });
  setSession(res, user.id);
  res.status(201).json({ user });
}));

router.post("/auth/login", authLimiter, asyncRoute(async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Enter a valid email and password.", 400);
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    throw new AppError("AUTH_INVALID", "Email or password is incorrect.", 401);
  }
  setSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email } });
}));

router.post("/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true } });
  if (!user) throw new AppError("AUTH_INVALID", "Account no longer exists.", 401);
  res.json({ user });
}));

router.get("/conversations", requireAuth, asyncRoute(async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, createdAt: true, updatedAt: true }
  });
  res.json({ conversations });
}));

router.post("/conversations", requireAuth, asyncRoute(async (req, res) => {
  const title = z.string().max(80).optional().parse(req.body?.title);
  const conversation = await prisma.conversation.create({
    data: { userId: req.userId!, title: title?.trim() || "New conversation" }
  });
  res.status(201).json({ conversation });
}));

router.get("/conversations/:id/messages", requireAuth, asyncRoute(async (req, res) => {
  const conversation = await prisma.conversation.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!conversation) throw new AppError("NOT_FOUND", "Conversation not found.", 404);
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, role: true, content: true, createdAt: true }
  });
  res.json({ messages });
}));

const chatSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  conversationId: z.string().optional()
});

const chatLimiter = buildLimiter(60_000, 20, "mitra:chat");

router.post("/chat", requireAuth, chatLimiter, asyncRoute(async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Message must contain 1–8000 characters.", 400);
  const conversation = parsed.data.conversationId
    ? await prisma.conversation.findFirst({ where: { id: parsed.data.conversationId, userId: req.userId } })
    : await prisma.conversation.create({ data: { userId: req.userId! } });
  if (!conversation) throw new AppError("NOT_FOUND", "Conversation not found.", 404);
  const previous = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 12
  });
  const history = [...previous.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })), { role: "user" as const, content: parsed.data.message }];
  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: parsed.data.message } });
  const result = await generateReply(history);
  const assistant = await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: result.text, provider: result.provider }
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      title: conversation.title === "New conversation" ? parsed.data.message.slice(0, 60) : conversation.title
    }
  });
  res.json({ reply: result.text, provider: result.provider, conversationId: conversation.id, messageId: assistant.id });
}));

router.post("/chat/stream", requireAuth, chatLimiter, asyncRoute(async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Message must contain 1–8000 characters.", 400);
  let conversation = parsed.data.conversationId
    ? await prisma.conversation.findFirst({ where: { id: parsed.data.conversationId, userId: req.userId } })
    : await prisma.conversation.create({ data: { userId: req.userId! } });
  if (!conversation) throw new AppError("NOT_FOUND", "Conversation not found.", 404);

  const previous = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 12
  });
  const history = [...previous.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })), { role: "user" as const, content: parsed.data.message }];
  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: parsed.data.message } });

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let fullText = "";
  let provider = "unknown";
  try {
    for await (const chunk of streamReply(history)) {
      fullText += chunk.text;
      provider = chunk.provider;
      res.write(`event: delta\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }
    const assistant = await prisma.message.create({
      data: { conversationId: conversation.id, role: "assistant", content: fullText, provider }
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: conversation.title === "New conversation" ? parsed.data.message.slice(0, 60) : conversation.title }
    });
    res.write(`event: done\ndata: ${JSON.stringify({ conversationId: conversation.id, messageId: assistant.id, provider })}\n\n`);
  } catch (err) {
    const appError = err instanceof AppError ? err : new AppError("PROVIDER_UNAVAILABLE", "AI providers are temporarily unavailable.", 503);
    res.write(`event: error\ndata: ${JSON.stringify({ code: appError.code, message: appError.message })}\n\n`);
  } finally {
    res.end();
  }
}));

router.post("/voice", requireAuth, asyncRoute(async (req, res) => {
  const text = z.string().min(1).max(5000).parse(req.body?.text);
  if (!env.ELEVENLABS_API_KEY) throw new AppError("VOICE_UNAVAILABLE", "ElevenLabs voice is not configured.", 503);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID)}`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new AppError("VOICE_PROVIDER_ERROR", "Voice generation failed.", 502);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(await response.arrayBuffer()));
}));

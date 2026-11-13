# Mitra AI — production-oriented full-stack starter

Mitra is a voice-enabled AI assistant with a React/TypeScript client, Express API, PostgreSQL conversation storage, Redis-backed rate limiting, server-side Gemini/Mistral credentials, and SSE chat streaming.

## What is included

- Email/password registration and login; passwords hashed with bcrypt.
- JWT in an HttpOnly cookie (not localStorage); same-site cookie policy and origin checks.
- Per-user chat throttling backed by Redis, plus IP-based authentication throttling.
- PostgreSQL persistence for users, conversations, messages, and usage counters.
- Server-side provider adapters for Gemini and Mistral.
- Provider fallback, bounded retries for transient failures, normalized API errors, request IDs, and structured logging.
- SSE streaming endpoint; the UI consumes incremental response events.
- Voice input via browser SpeechRecognition, browser speech output, and optional ElevenLabs server-side TTS.
- Docker Compose for app, PostgreSQL, and Redis.
- GitHub Actions CI for dependency install, Prisma generation, tests, and build.

## Requirements

- Node.js 22+
- Docker Desktop (recommended for PostgreSQL and Redis)
- Gemini and/or Mistral API key. ElevenLabs is optional.

## Local development

1. Copy `.env.example` to `.env`.
2. Set a random `JWT_SECRET` (at least 32 characters) and add at least one provider key.
3. Start infrastructure:

   ```bash
   docker compose up -d postgres redis
   ```

4. Install and prepare the database:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

5. Start the API and Vite frontend:

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - API health: http://localhost:8080/api/health

The first migration is created from `server/prisma/schema.prisma` by `prisma migrate dev`; commit the generated `server/prisma/migrations` directory. For a fresh checkout, create the initial migration once with `npm run db:migrate`, then commit it.

## Docker deployment

Set real production values in `.env` before running. Use a strong unique `JWT_SECRET`, real provider keys, and set `COOKIE_SECURE=true` when TLS terminates in front of the app.

```bash
docker compose up --build -d
```

The app listens on port 8080. Put it behind a TLS-enabled reverse proxy or deploy to a platform that provides HTTPS. Do not expose PostgreSQL or Redis publicly.

## Deploying to a hosting provider

This repository is container-ready, but it is **not live-deployed**: deployment requires your hosting account, domain (if any), and production secrets.

1. Create a managed PostgreSQL database and Redis instance.
2. Deploy this repository using its `Dockerfile`.
3. Configure `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `GEMINI_API_KEY` and/or `MISTRAL_API_KEY`, `CLIENT_ORIGIN`, `NODE_ENV=production`, and `COOKIE_SECURE=true`.
4. Set the platform health check to `/api/health`.
5. Ensure the platform runs the container command in the Dockerfile so Prisma migrations are applied.
6. Test registration, login, chat streaming, refresh/re-login, rate limits, and logout over HTTPS.

For same-origin deployment, set `CLIENT_ORIGIN` to the public app origin. If you split frontend and API origins, update CORS/cookie settings deliberately; cross-site cookies require `SameSite=None; Secure` and additional CSRF protection.

## API overview

- `GET /api/health` — health check (does not expose secrets).
- `POST /api/auth/register` — `{ "email": "...", "password": "..." }`
- `POST /api/auth/login` — same body.
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/chat/stream` — `{ "message": "...", "conversationId": "..." }`; emits SSE events:
  - `event: delta` with `{ "text": "..." }`
  - `event: done` with `{ "conversationId": "...", "messageId": "..." }`
  - `event: error` with normalized `{ "code": "...", "message": "..." }`
- `POST /api/voice` — `{ "text": "..." }`; returns audio/mpeg when ElevenLabs is configured.

## Provider fallback and error normalization

Provider priority is Gemini then Mistral when both are configured. Transient network, 408, 429, and 5xx failures receive bounded exponential-backoff retries. Authentication/configuration errors and invalid model errors are not retried. If a provider fails before producing output, Mitra switches to the next configured provider. Once an SSE response has emitted output, it cannot safely switch providers without duplicating or corrupting the answer; a normalized stream error is emitted instead.

Normalized error codes include `AUTH_INVALID`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_AUTH`, `PROVIDER_MODEL`, `VALIDATION_ERROR`, and `INTERNAL_ERROR`. Logs include request IDs and provider/status metadata but never API keys, passwords, cookies, or message content.

## Production hardening checklist

Before handling real users:
- Use managed PostgreSQL and Redis with backups, TLS, and restricted network access.
- Set secrets in the hosting provider's secret manager; never commit `.env`.
- Configure HTTPS, secure cookies, domain/origin allowlists, and a reverse proxy with request-size limits.
- Add email verification, password reset, account deletion/export, and abuse monitoring if public registration is enabled.
- Configure centralized logs, alerts, uptime monitoring, and database backup restore drills.
- Review privacy policy, retention/deletion policy, and applicable data-protection obligations.
- Consider a durable job queue for long-running voice/TTS workloads and a distributed tracing/metrics stack.
- Run dependency/security scans and a load test against the actual hosting plan.

This is a production-oriented baseline, not a certification or guarantee of production security. Review and test it in your deployment environment before public launch.

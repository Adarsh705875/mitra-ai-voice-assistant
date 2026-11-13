<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:080b16,45:5b5cf0,100:00d4ff&height=230&section=header&text=Mitra%20AI&fontSize=64&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Your%20multilingual%20AI%20chat%20and%20voice%20assistant&descAlignY=60&descSize=18" width="100%" />

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-111111?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

**A full-stack AI assistant with real-time streaming, persistent chat history, secure accounts, and voice interaction.**

</div>

---

## 📖 About Mitra

**Mitra AI** is a full-stack, multilingual AI chat and voice assistant. Users can create an account, hold conversations with an AI model, revisit previous chats, speak through a microphone, and listen to responses.

The application uses a React and TypeScript frontend with an Express and TypeScript API. PostgreSQL stores user accounts and conversation history, Redis supports rate limiting, and AI provider integrations run on the server so provider credentials are never exposed to the browser.

Mitra currently supports Google Gemini and optional Mistral text generation. It can use browser speech capabilities for voice input and output, with optional ElevenLabs text-to-speech for generated audio.

## ✨ Features

| | Feature | Details |
|---|---|---|
| 💬 | **AI chat** | Send messages to configured Gemini or Mistral models and receive generated responses. |
| ⚡ | **Live response streaming** | Server-Sent Events (SSE) deliver response text incrementally instead of waiting for the full answer. |
| 🧠 | **Conversation memory** | PostgreSQL stores conversations and messages so users can reopen previous chats. Recent message history is sent to the model as context. |
| 👤 | **User accounts** | Email/password registration, login, logout, and authenticated sessions. |
| 🔐 | **Secure authentication** | Passwords are hashed with bcrypt. Session JWTs are stored in HttpOnly cookies rather than browser local storage. |
| 🎙️ | **Voice input** | Browser speech recognition converts speech into text. Available language choices include English (India/US/UK), Hindi, Marathi, and Kannada, subject to browser support. |
| 🔊 | **Voice output** | Use browser speech synthesis for free, or configure ElevenLabs for server-generated audio. |
| 🔁 | **Provider fallback** | Gemini models are attempted in configured order; Mistral can be used as an additional provider when configured. |
| 🛡️ | **Rate limiting** | Redis-backed limits protect authentication and chat endpoints. |
| 📱 | **Responsive interface** | Chat workspace, conversation sidebar, settings, and voice controls. |
| 🐳 | **Containerized services** | Docker Compose starts the app, PostgreSQL, and Redis. |
| 🔄 | **CI workflow** | GitHub Actions runs dependency setup, Prisma generation, tests, and production builds. |

## 🖥️ Application preview

<!-- Add screenshots to a /screenshots folder and uncomment the image below. -->

<!-- ![Mitra AI application preview](./screenshots/mitra-preview.png) -->

_Add a screenshot or short GIF of the Mitra chat interface here._

## 🧰 Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | User interface and client application |
| UI styling | CSS | Responsive layout and visual styling |
| Icons | Lucide React | Interface icons |
| Backend | Node.js, Express, TypeScript | REST API, authentication, chat orchestration |
| Validation | Zod | Request and environment validation |
| Database | PostgreSQL | Users, conversations, and messages |
| ORM | Prisma | Database schema, queries, and migrations |
| Cache / limits | Redis | Rate limiting and shared counters |
| Authentication | JWT, HttpOnly cookies, bcryptjs | Authenticated sessions and password hashing |
| AI providers | Google Gemini, Mistral | Language model responses |
| Streaming | Server-Sent Events (SSE) | Incremental AI response delivery |
| Speech input | Web Speech API | Browser microphone transcription |
| Speech output | SpeechSynthesis API, optional ElevenLabs | Spoken assistant responses |
| Infrastructure | Docker, Docker Compose | Container builds and local service orchestration |
| CI | GitHub Actions | Automated verification on pushes and pull requests |

## 🏗️ Architecture

```text
                         ┌──────────────────────────┐
                         │       React + Vite        │
                         │       TypeScript UI      │
                         └────────────┬─────────────┘
                                      │ HTTP / SSE
                                      ▼
                         ┌──────────────────────────┐
                         │     Express API          │
                         │ Authentication + Chat    │
                         │ Validation + Rate limits │
                         └───────┬──────────┬───────┘
                                 │          │
                       ┌─────────▼───┐  ┌───▼─────────┐
                       │ PostgreSQL  │  │    Redis    │
                       │ Chat + Users│  │ Rate limits │
                       └─────────────┘  └─────────────┘
                                 │
                                 ▼
                         ┌──────────────────────────┐
                         │     Provider layer       │
                         │ Gemini / optional Mistral│
                         └──────────────────────────┘

             Optional voice services: Browser Speech APIs / ElevenLabs
```

### Chat request lifecycle

1. The user signs in and the browser receives an HttpOnly session cookie.
2. The frontend sends a message to the authenticated chat endpoint.
3. The API validates the request, checks rate limits, and loads the user's recent conversation history from PostgreSQL.
4. The provider layer sends the prompt and recent history to the configured AI provider.
5. The API parses the provider's streaming events and forwards text deltas to the browser using SSE.
6. The completed assistant response is saved in PostgreSQL and a `done` event is sent to the client.
7. If a provider fails before output begins, Mitra can retry transient failures and try another configured model/provider. It does not switch providers after partial text has already been sent, because doing so could duplicate the response.

## 📁 Project structure

```text
mitra-ai-voice-assistant/
├── client/
│   ├── src/
│   │   ├── App.tsx              # Main chat, account, settings, and voice UI
│   │   ├── api.ts               # Frontend API client and SSE reader
│   │   ├── main.tsx             # React application entry point
│   │   └── style.css            # Application styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   └── schema.prisma        # User, Conversation, and Message models
│   ├── src/
│   │   ├── auth.ts              # Session cookie and auth middleware
│   │   ├── config.ts            # Environment configuration and validation
│   │   ├── db.ts                # Prisma client
│   │   ├── errors.ts            # API/provider error normalization
│   │   ├── index.ts             # Express server entry point
│   │   ├── limits.ts            # Redis-backed rate limiters
│   │   ├── logger.ts            # Structured logging
│   │   ├── providers.ts         # Gemini/Mistral adapters and stream parsing
│   │   ├── routes.ts            # Auth, conversation, chat, and voice routes
│   │   └── types.d.ts           # Shared server type declarations
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions verification workflow
├── .dockerignore
├── .env.example                 # Environment variable template
├── .gitignore
├── Dockerfile
├── docker-compose.yml           # App + PostgreSQL + Redis
├── package.json                # npm workspace scripts
└── README.md
```

## ⚙️ Requirements

- Node.js 22 or newer for local development.
- npm.
- Docker Desktop or a Docker-compatible environment for the Compose setup.
- A Google Gemini API key, or a Mistral API key. At least one text provider must be configured.
- Optional: an ElevenLabs API key and voice ID for ElevenLabs text-to-speech.

## 🚀 Run with Docker Compose

This is the simplest way to run the complete stack, including PostgreSQL and Redis.

### 1. Clone the repository

```bash
git clone https://github.com/Adarsh705875/mitra-ai-voice-assistant.git
cd mitra-ai-voice-assistant
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and configure at least:

```env
NODE_ENV=production
PORT=8080
JWT_SECRET=replace-with-a-long-random-secret-of-at-least-32-characters
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.8-flash
```

The model list above records the Gemini model order tested during Mitra development. Model availability can change by account, region, and provider capacity. If a model is unavailable, replace it with a model currently enabled for your API key. Keep all API keys and secrets in `.env` or your hosting provider's secret manager. Never commit them or paste them into public issues.

If you use Mistral, configure it as well:

```env
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-small-latest
```

Optional ElevenLabs configuration:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
```

Generate a strong `JWT_SECRET`; do not use the example value in a real deployment.

### 3. Start Mitra

```bash
docker compose up -d --build
```

Check service status:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f app
```

Open the application at:

```text
http://localhost:8080
```

Health endpoint:

```text
http://localhost:8080/api/health
```

Stop the services:

```bash
docker compose down
```

To stop services and delete the local database/cache volumes as well (this permanently deletes local persisted data):

```bash
docker compose down -v
```

## 💻 Local development without the app container

You can run the frontend and API directly with Node.js while using Docker only for PostgreSQL and Redis.

1. Create `.env` from `.env.example`.
2. For this mode, use local service URLs in `.env`:

   ```env
   DATABASE_URL=postgresql://mitra:mitra_dev_password@localhost:5432/mitra?schema=public
   REDIS_URL=redis://localhost:6379
   CLIENT_ORIGIN=http://localhost:5173
   ```

3. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d postgres redis
   ```

4. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npm run db:generate
   ```

5. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

6. Start the frontend and backend in development mode:

   ```bash
   npm run dev
   ```

   - Frontend: `http://localhost:5173`
   - API: `http://localhost:8080`
   - Health: `http://localhost:8080/api/health`

Build both workspaces:

```bash
npm run build
```

Run the server test script:

```bash
npm test
```

## 🔑 Environment variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development`, `test`, or `production`. |
| `PORT` | No | API port; defaults to `8080`. |
| `CLIENT_ORIGIN` | Yes for browser use | Allowed frontend origin for CORS/origin checks. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `REDIS_URL` | Recommended | Redis connection string for rate limiting. |
| `JWT_SECRET` | Yes | Secret used to sign session tokens; at least 32 characters. |
| `COOKIE_SECURE` | No | Set to `true` when cookies are served over HTTPS. Production mode also enables secure cookies. |
| `GEMINI_API_KEY` | One provider required | Google Gemini API key. |
| `GEMINI_MODELS` | No | Comma-separated Gemini model IDs, tried in order. |
| `MISTRAL_API_KEY` | One provider required | Optional Mistral API key for provider fallback or use without Gemini. |
| `MISTRAL_MODEL` | No | Mistral model ID; defaults to `mistral-small-latest`. |
| `ELEVENLABS_API_KEY` | No | Enables ElevenLabs voice generation. |
| `ELEVENLABS_VOICE_ID` | No | ElevenLabs voice identifier. |

The Docker Compose configuration supplies internal container addresses for PostgreSQL and Redis to the app service. When running the API directly on your machine, use `localhost` service addresses instead.

## 🔌 API overview

All API routes are prefixed with `/api`. Routes marked **Authenticated** require a valid Mitra session cookie.

| Method | Endpoint | Auth | Purpose |
|---|---|---:|---|
| `GET` | `/api/health` | No | Health check. |
| `POST` | `/api/auth/register` | No | Create an account using email and password. |
| `POST` | `/api/auth/login` | No | Authenticate and set the session cookie. |
| `POST` | `/api/auth/logout` | No | Clear the session cookie. |
| `GET` | `/api/auth/me` | Yes | Return the current user. |
| `GET` | `/api/conversations` | Yes | List the current user's recent conversations. |
| `POST` | `/api/conversations` | Yes | Create a conversation. |
| `GET` | `/api/conversations/:id/messages` | Yes | Load messages for a conversation owned by the user. |
| `POST` | `/api/chat` | Yes | Generate a complete, non-streaming response. |
| `POST` | `/api/chat/stream` | Yes | Stream an AI response using SSE. |
| `POST` | `/api/voice` | Yes | Generate audio from text when ElevenLabs is configured. |

### Streaming chat request

`POST /api/chat/stream`

```json
{
  "message": "Hello Mitra, explain machine learning simply.",
  "conversationId": "optional-existing-conversation-id"
}
```

The `conversationId` field can be omitted to create a new conversation. The response uses `text/event-stream` and emits events such as:

```text
event: delta
data: {"text":"Hello"}

event: delta
data: {"text":"! How can I help?"}

event: done
data: {"conversationId":"...","messageId":"...","provider":"gemini"}
```

If generation fails, the server sends an `error` event with a normalized error code and message. The client reads the stream and appends each `delta` to the current assistant message.

### Voice generation request

`POST /api/voice`

```json
{
  "text": "Hello, how can I help you?"
}
```

When ElevenLabs is configured, the endpoint returns `audio/mpeg`. If it is not configured, the frontend can use browser speech synthesis instead.

## 🧠 AI provider configuration and fallback

- Gemini is used when `GEMINI_API_KEY` is configured. The comma-separated `GEMINI_MODELS` value determines model order.
- Mistral is available when `MISTRAL_API_KEY` is configured.
- The provider layer supports bounded retries for transient network and server errors.
- If a configured Gemini model fails before text is emitted, Mitra can attempt the next configured model and then another configured provider.
- Once response text has been streamed to the browser, Mitra does not switch providers mid-response. This avoids repeating or corrupting partially delivered output.
- Provider errors are normalized before being returned to the client. Request logs should not contain API keys, passwords, cookies, or private conversation content.

Provider model names and capacity are controlled by the provider and can change. A temporary provider `503` or capacity error does not necessarily mean the API key is invalid; check the provider status and try another available model.

## 🗣️ Voice and language settings

Mitra's current interface includes speech language settings for:

- English (India)
- English (United States)
- English (United Kingdom)
- Hindi
- Marathi
- Kannada

Speech recognition availability depends on the browser and operating system. Microphone permission must be granted, and browser speech services may require an internet connection. Browser speech synthesis uses voices installed or exposed by the user's device. ElevenLabs output requires a configured API key and may incur provider charges.

## 🛡️ Security and privacy notes

Implemented security measures include:

- Password hashing with bcrypt.
- JWT session stored in an HttpOnly cookie.
- Authenticated ownership checks for conversation access.
- Request validation with Zod.
- Authentication and chat rate limiting backed by Redis.
- Provider credentials held on the server, not in frontend code.
- Normalized API errors and structured server logging.

Before making Mitra public, also:

- Use HTTPS and secure cookies in production.
- Replace development database passwords and JWT secrets.
- Use managed PostgreSQL and Redis with private networking, backups, and TLS where available.
- Restrict CORS/origin settings to the real frontend domain.
- Configure secret values through your hosting platform, not committed files.
- Add privacy policy, data retention/deletion rules, account recovery, and email verification if required by your use case.
- Review dependency vulnerabilities, perform load testing, and test backup restoration.

**Important:** This repository is a production-oriented application baseline, not a security certification or guarantee that a deployment is production-ready. Production readiness depends on the hosting environment, secrets, monitoring, operational controls, and security review.

## 🐛 Troubleshooting

| Symptom | What to check |
|---|---|
| App does not start | Run `docker compose ps` and `docker compose logs -f app`. Check that `.env` exists and required values are set. |
| Database connection error | Confirm PostgreSQL is healthy with `docker compose ps`; check `DATABASE_URL` and migration output. |
| Redis connection or rate-limit issue | Confirm Redis is healthy and `REDIS_URL` points to the correct service. In Docker Compose, the hostname is `redis`, not `localhost`. |
| `AI providers are temporarily unavailable` | Check provider API key, model ID, provider quota/capacity, and `docker compose logs -f app`. Confirm at least one provider is configured. |
| Gemini returns `503` | This can be a temporary model capacity issue. Try a currently available model and put it earlier in `GEMINI_MODELS`. |
| Chat stays on “Thinking…” | Inspect app logs and confirm the provider stream returns data. Check the provider SSE parser and browser stream handling. The parser should handle event boundaries correctly and the API should emit `delta`, `done`, or `error` events. |
| Microphone does not work | Use a supported browser such as Chrome or Edge, allow microphone permission, and check the selected speech language. |
| No spoken response | Check device volume and browser speech support. For ElevenLabs, verify the server-side key and voice ID; browser voice is the free fallback. |
| Browser cannot reach API | Check `CLIENT_ORIGIN`, the API URL used by the frontend, and whether the frontend/API are served from the expected origin. |

Useful Docker commands:

```bash
# Show running services
docker compose ps

# Follow application logs
docker compose logs -f app

# Restart the application container
docker compose restart app

# Rebuild and recreate the app after code changes
docker compose up -d --build --force-recreate app

# Inspect the last 200 application log lines
docker compose logs --tail=200 app
```

## 🗺️ Roadmap

- [ ] Add password reset and email verification.
- [ ] Add account deletion and conversation deletion controls.
- [ ] Add configurable system prompts and per-user assistant preferences.
- [ ] Add file and image uploads for multimodal conversations.
- [ ] Add richer voice conversation mode with turn-taking.
- [ ] Add usage dashboards and provider/token cost tracking.
- [ ] Add automated integration tests for authentication, chat streaming, and provider fallback.
- [ ] Add centralized metrics, tracing, alerts, and uptime monitoring.
- [ ] Complete deployment-specific security review and load testing.

## 🎓 What this project demonstrates

- Designing and connecting a React/TypeScript frontend to a Node.js API.
- Building authenticated REST APIs and secure cookie-based sessions.
- Modeling persistent users, conversations, and messages with PostgreSQL and Prisma.
- Integrating external LLM APIs behind a provider abstraction.
- Implementing real-time streaming with Server-Sent Events.
- Handling provider retries, model fallback, and normalized errors.
- Integrating browser speech APIs and optional hosted text-to-speech.
- Running multiple services with Docker Compose and validating builds with GitHub Actions.

## 👤 Author

**Adarsh Kadam** — AI/ML Developer · Software Developer · Game Developer

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Adarsh705875)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/adarsh-kadam-96414a302/)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:adarshkadam06@gmail.com)

---

<div align="center">

⭐ If Mitra is useful to you, consider starring the repository.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00d4ff,50:5b5cf0,100:080b16&height=110&section=footer" width="100%" />

</div>

import { env } from "./config";
import { isRetryable, normalizeProviderError } from "./errors";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ProviderName = "gemini" | "mistral";
export type ProviderResult = { text: string; provider: ProviderName };

const SYSTEM_PROMPT = "You are Mitra, a concise, helpful multilingual voice assistant. Reply in the language and script used by the user. Do not introduce yourself unnecessarily.";

const providers: ProviderName[] = [
  ...(env.GEMINI_API_KEY ? ["gemini" as const] : []),
  ...(env.MISTRAL_API_KEY ? ["mistral" as const] : [])
];

async function retry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await operation(); }
    catch (err) {
      last = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** i)));
    }
  }
  throw last;
}

async function gemini(messages: ChatMessage[], model: string): Promise<string> {
  const contents = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY! },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents }),
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function mistral(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.MISTRAL_API_KEY}` },
    body: JSON.stringify({
      model: env.MISTRAL_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-12)],
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) throw new Error(`Mistral ${response.status}`);
  const data = await response.json() as any;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Mistral returned an empty response");
  return text;
}

export async function generateReply(messages: ChatMessage[]): Promise<ProviderResult> {
  if (!providers.length) throw normalizeProviderError(new Error("No provider configured"));
  let last: unknown;
  for (const provider of providers) {
    try {
      const text = await retry(async () => {
        if (provider === "gemini") {
          const models = env.GEMINI_MODELS.split(",").map((x) => x.trim()).filter(Boolean);
          let modelError: unknown;
          for (const model of models) {
            try { return await gemini(messages, model); }
            catch (err) {
              modelError = err;
              if (!(err instanceof Error) || !err.message.includes("404")) throw err;
            }
          }
          throw modelError || new Error("No Gemini model configured");
        }
        return mistral(messages);
      });
      return { text, provider };
    } catch (err) {
      last = err;
    }
  }
  throw normalizeProviderError(last);
}

async function* parseSse(response: Response): AsyncGenerator<string> {
  if (!response.body) throw new Error("Streaming body unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const payload = dataLine.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content
            ?? json.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("")
            ?? "";
          if (token) yield token;
        } catch { /* ignore provider keepalive frames */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamMistral(messages: ChatMessage[]): AsyncGenerator<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.MISTRAL_API_KEY}` },
    body: JSON.stringify({
      model: env.MISTRAL_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-12)],
      stream: true
    }),
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) throw new Error(`Mistral ${response.status}`);
  yield* parseSse(response);
}

async function* streamGemini(messages: ChatMessage[], model: string): AsyncGenerator<string> {
  const contents = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY! },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents }),
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  yield* parseSse(response);
}

export async function* streamReply(messages: ChatMessage[]): AsyncGenerator<{ text: string; provider: ProviderName }> {
  let last: unknown;
  for (const provider of providers) {
    let emitted = false;
    try {
      const source = provider === "mistral"
        ? streamMistral(messages)
        : streamGemini(messages, env.GEMINI_MODELS.split(",")[0].trim());
      for await (const token of source) {
        emitted = true;
        yield { text: token, provider };
      }
      if (!emitted) throw new Error(`${provider} returned an empty stream`);
      return;
    } catch (err) {
      last = err;
      if (emitted) throw normalizeProviderError(err);
    }
  }
  throw normalizeProviderError(last);
}

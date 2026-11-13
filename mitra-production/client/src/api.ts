export type User = { id: string; email: string };
export type Message = { id?: string; role: "user" | "assistant"; content: string; createdAt?: string };
export type Conversation = { id: string; title: string; updatedAt: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Request failed");
  return data as T;
}

export const api = {
  me: () => request<{ user: User }>("/auth/me"),
  login: (email: string, password: string) => request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) => request<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  conversations: () => request<{ conversations: Conversation[] }>("/conversations"),
  createConversation: () => request<{ conversation: Conversation }>("/conversations", { method: "POST", body: JSON.stringify({}) }),
  messages: (id: string) => request<{ messages: Message[] }>(`/conversations/${id}/messages`),
  stream: async (
    message: string,
    conversationId: string | undefined,
    onDelta: (text: string) => void
  ) => {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
      body: JSON.stringify({ message, conversationId })
    });
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || "Unable to start response stream");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: { conversationId: string; messageId: string; provider: string } | undefined;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const eventName = event.match(/^event:\s*(.+)$/m)?.[1]?.trim();
        const payload = event.match(/^data:\s*(.+)$/m)?.[1];
        if (!payload) continue;
        const parsed = JSON.parse(payload);
        if (eventName === "delta") onDelta(parsed.text);
        if (eventName === "done") result = parsed;
        if (eventName === "error") throw new Error(parsed.message || "AI response failed");
      }
    }
    if (!result) throw new Error("Response stream ended unexpectedly");
    return result;
  },
  voice: async (text: string) => {
    const response = await fetch("/api/voice", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error("Voice service unavailable");
    return URL.createObjectURL(await response.blob());
  }
};

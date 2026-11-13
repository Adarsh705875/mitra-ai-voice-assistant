import { FormEvent, useEffect, useRef, useState } from "react";
import { AudioLines, Bot, LogOut, MessageSquarePlus, Mic, Send, Settings2, Sparkles, User as UserIcon, Volume2 } from "lucide-react";
import { api, Conversation, Message, User } from "./api";

const LANGUAGES = [
  ["en-IN", "English (India)"], ["en-US", "English (US)"], ["en-GB", "English (UK)"],
  ["hi-IN", "Hindi"], ["mr-IN", "Marathi"], ["kn-IN", "Kannada"]
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en-IN");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"browser" | "eleven">("browser");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    api.me().then(({ user }) => setUser(user)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.conversations().then(({ conversations }) => {
      setConversations(conversations);
      if (conversations[0]) void openConversation(conversations[0].id);
      else void newConversation();
    }).catch((e) => setError(e.message));
  }, [user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function openConversation(id: string) {
    setActiveId(id);
    const data = await api.messages(id);
    setMessages(data.messages);
  }

  async function newConversation() {
    const { conversation } = await api.createConversation();
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    setMessages([]);
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true); setError("");
    try {
      const result = authMode === "login" ? await api.login(email, password) : await api.register(email, password);
      setUser(result.user);
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed"); }
    finally { setAuthBusy(false); }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setUser(null); setMessages([]); setConversations([]); setActiveId(undefined);
  }

  async function sendMessage(raw = input) {
    const content = raw.trim();
    if (!content || busy) return;
    setInput(""); setError(""); setBusy(true);
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    try {
      const result = await api.stream(content, activeId, (delta) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + delta };
          return copy;
        });
      });
      setActiveId(result.conversationId);
      const list = await api.conversations();
      setConversations(list.conversations);
    } catch (e) {
      setMessages((prev) => prev.slice(0, -1));
      setError(e instanceof Error ? e.message : "Mitra could not respond");
    } finally { setBusy(false); }
  }

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Speech recognition is not supported here. Use Chrome or Edge."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event: any) => {
      setListening(false);
      setError(event.error === "not-allowed" ? "Microphone permission is blocked." : `Microphone error: ${event.error}`);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) void sendMessage(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function speakBrowser(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0900-\u097F]/.test(text) ? (language === "mr-IN" ? "mr-IN" : "hi-IN") : language;
    window.speechSynthesis.speak(utterance);
  }

  async function speak(text: string) {
    if (voiceMode === "browser") { speakBrowser(text); return; }
    try {
      const url = await api.voice(text);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch { speakBrowser(text); }
  }

  if (!user) return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark"><Bot size={26} /></div>
        <p className="eyebrow">YOUR PERSONAL AI</p>
        <h1>Mitra<span>.</span></h1>
        <p className="subtle">A multilingual assistant that remembers your conversations.</p>
        <form onSubmit={submitAuth}>
          <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary full" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <button className="text-button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setError(""); }}>
          {authMode === "login" ? "New to Mitra? Create an account" : "Already registered? Log in"}
        </button>
        <p className="tiny">Your credentials are stored securely by the Mitra server. Provider API keys never enter the browser.</p>
      </div>
    </main>
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small"><Bot size={20} /></div><span>MITRA<span className="cyan">.</span></span></div>
        <button className="new-chat" onClick={() => void newConversation()}><MessageSquarePlus size={17} /> New conversation</button>
        <p className="side-label">RECENT</p>
        <div className="conversation-list">
          {conversations.map((c) => <button key={c.id} className={`conversation ${activeId === c.id ? "active" : ""}`} onClick={() => void openConversation(c.id)}><span>{c.title}</span></button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="account"><div className="avatar"><UserIcon size={16} /></div><div className="account-copy"><b>{user.email}</b><span>Personal workspace</span></div></div>
          <button className="icon-button" title="Log out" onClick={() => void logout()}><LogOut size={17} /></button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div><span className="status-dot" /> <span className="topbar-label">MITRA AI</span><span className="topbar-separator">/</span><span className="topbar-muted">Assistant</span></div>
          <button className="icon-button" onClick={() => setSettingsOpen(!settingsOpen)} title="Settings"><Settings2 size={18} /></button>
        </header>
        {settingsOpen && <div className="settings-popover">
          <label>Speech language<select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Voice output<select value={voiceMode} onChange={(e) => setVoiceMode(e.target.value as any)}><option value="browser">Browser voice (free)</option><option value="eleven">ElevenLabs (server configured)</option></select></label>
          <p>AI provider credentials are configured on the server, not in this panel.</p>
        </div>}

        <div className="chat-area">
          {messages.length === 0 ? <div className="welcome">
            <div className="welcome-orb"><Sparkles size={27} /></div>
            <p className="eyebrow">A BETTER WAY TO THINK</p>
            <h2>What can I help<br />you with today?</h2>
            <p className="subtle">Ask a question, explore an idea, or speak naturally.</p>
            <div className="suggestions">
              {["Explain a complex topic simply", "Help me plan my week", "Give me ideas for a project"].map((s) => <button key={s} onClick={() => void sendMessage(s)}>{s}<span>↗</span></button>)}
            </div>
          </div> : <div className="messages">
            {messages.map((m, i) => <div className={`message-row ${m.role}`} key={`${i}-${m.role}`}>
              <div className="message-avatar">{m.role === "assistant" ? <Bot size={17} /> : <UserIcon size={16} />}</div>
              <div className="message-content"><div className="message-role">{m.role === "assistant" ? "MITRA" : "YOU"}</div><div className="message-text">{m.content || (busy && i === messages.length - 1 ? <span className="typing">Mitra is thinking<span>.</span><span>.</span><span>.</span></span> : "")}</div>
                {m.role === "assistant" && m.content && <button className="speak-button" onClick={() => void speak(m.content)}><Volume2 size={14} /> Listen</button>}
              </div>
            </div>)}
            <div ref={bottomRef} />
          </div>}
        </div>
        <div className="composer-wrap">
          {error && <div className="inline-error">{error}</div>}
          <form className="composer" onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}>
            <button type="button" className={`mic-button ${listening ? "listening" : ""}`} title="Speak" onClick={startListening} disabled={busy}><Mic size={19} /></button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message Mitra…" disabled={busy} />
            <button className="send-button" disabled={busy || !input.trim()} aria-label="Send"><Send size={17} /></button>
          </form>
          <p className="composer-note"><AudioLines size={12} /> Mitra can make mistakes. Verify important information.</p>
        </div>
      </section>
    </main>
  );
}

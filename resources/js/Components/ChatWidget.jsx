import { useState, useEffect, useRef, useMemo } from 'react';
import I from './Icons';

const CHAT_STORAGE = "limitra.chat.history.v1";

function buildSystemPrompt(catalog) {
  const cats = (catalog || []).map((p) =>
    `${p.name} (${p.category} > ${p.subcategory}, ${p.price})`
  ).join("; ");

  return `You are Limitra Assistant — a friendly, concise personal shopping guide for Limitra USA, a curated product discovery platform covering fashion, beauty, home, lifestyle and travel.

Your job: help users discover products they'll love. When recommending, always name specific products from the catalog below so they can be surfaced as cards in the chat.

CATALOG (name, category, price):
${cats.slice(0, 3000)}

RULES:
- Recommend 2–4 specific products per reply by stating their EXACT name from the catalog.
- Keep replies short (2–4 sentences + product list). No long paragraphs.
- Always end with a brief follow-up question to refine the suggestion.
- Never mention prices — users click through to discover them.
- Tone: warm, editorial, knowledgeable — like a trusted style friend.
- If asked something unrelated to shopping, gently steer back.`;
}

function extractProducts(text, catalog) {
  if (!text || !catalog) return [];
  const found = [];
  catalog.forEach((p) => {
    if (text.toLowerCase().includes(p.name.toLowerCase()) && !found.find((x) => x.id === p.id)) {
      found.push(p);
    }
  });
  return found.slice(0, 4);
}

function ChatProdCard({ p }) {
  return (
    <a href={`/product/${p.id}`} className="chat-prod-card" target="_blank" rel="noopener">
      <div className="cpc-img">
        {p.image && <img src={p.image} alt={p.name} />}
      </div>
      <div className="cpc-body">
        <span className="cpc-cat">{p.subcategory}</span>
        <span className="cpc-name">{p.name}</span>
        <span className="cpc-cta">Shop Now →</span>
      </div>
    </a>
  );
}

function TypingDots() {
  return (
    <div className="chat-msg ai">
      <div className="chat-avatar"><span>L</span></div>
      <div className="chat-bubble typing">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
}

function ChatMessage({ msg, catalog }) {
  const products = useMemo(() => msg.role === "assistant" ? extractProducts(msg.content, catalog) : [], [msg.content, catalog]);
  return (
    <div className={`chat-msg ${msg.role === "user" ? "user" : "ai"}`}>
      {msg.role === "assistant" && (
        <div className="chat-avatar"><span>L</span></div>
      )}
      <div className="chat-bubble">
        {msg.content.split("\n").filter(Boolean).map((line, i) => (
          <p key={i} style={{ margin: "0 0 4px" }}>{line}</p>
        ))}
        {products.length > 0 && (
          <div className="chat-prod-strip">
            {products.map((p) => <ChatProdCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

const STARTERS = [
  "I'm looking for a gift under $100",
  "What's trending in beauty right now?",
  "Help me build a capsule wardrobe",
  "What should I pack for a beach trip?",
];

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

function ChatPanel({ onClose, catalog }) {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_STORAGE) || "[]"); } catch (e) { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const messages = history.length > 0 ? history : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE, JSON.stringify(history));
  }, [history]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput(""); setError(null);
    const userMsg = { role: "user", content: q };
    const next = [...history, userMsg];
    setHistory(next);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          system: buildSystemPrompt(catalog),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      setHistory([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const clearChat = () => { setHistory([]); localStorage.removeItem(CHAT_STORAGE); };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-logo">L</div>
          <div>
            <div className="chat-title">Limitra Assistant</div>
            <div className="chat-status"><span className="chat-dot"></span> Ready to help</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {history.length > 0 && (
            <button className="chat-header-btn" onClick={clearChat} title="Clear chat" aria-label="Clear chat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
          )}
          <button className="chat-header-btn" onClick={onClose} aria-label="Close chat">
            <I.close width="17" height="17" />
          </button>
        </div>
      </div>

      <div className="chat-body">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-logo">L</div>
            <h3>Hello! I'm your personal shopping guide.</h3>
            <p>Tell me what you're looking for and I'll find the perfect picks from our curated collection.</p>
            <div className="chat-starters">
              {STARTERS.map((s) => (
                <button key={s} className="chat-starter-btn" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <ChatMessage key={i} msg={msg} catalog={catalog} />)
        )}
        {loading && <TypingDots />}
        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef}></div>
      </div>

      <div className="chat-footer">
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask me anything — style, gifting, travel…"
          aria-label="Chat input"
          disabled={loading}
        />
        <button className="chat-send" onClick={() => send()} disabled={!input.trim() || loading} aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ChatWidget({ catalog }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.setProperty("--chat-open", "1");
    else document.body.style.removeProperty("--chat-open");
  }, [open]);

  return (
    <div className="chat-widget">
      {open && <ChatPanel onClose={() => setOpen(false)} catalog={catalog} />}
      <button
        className={"chat-fab" + (open ? " active" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open shopping assistant"}
      >
        {open ? (
          <I.close width="22" height="22" />
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Ask Elo</span>
          </>
        )}
      </button>
    </div>
  );
}

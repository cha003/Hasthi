// client/src/components/ChatbotWidget.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, Send, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthProvider";

export default function ChatbotWidget({
  endpoint = "/api/chat",     // change if your server proxy differs
  title = "Ask Hasthi Assistant",
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([
    { role: "model", text: "Hi! I’m the Hasthi assistant 🐘. Ask me about visits, entry tickets, events, adoptions, or anything on this site." }
  ]);

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setError("");
    setBusy(true);
    setMsgs(prev => [...prev, { role: "user", text }]);
    setInput("");

    try {
      const payload = {
        conversationId,
        message: text,
        userName: user?.name || "visitor",
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to reach assistant");
      }
      const data = await res.json();
      setConversationId(data.conversationId);
      setMsgs(prev => [...prev, { role: "model", text: data.reply }]);
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong");
      setMsgs(prev => [...prev, { role: "model", text: "Sorry, I couldn’t process that just now." }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMsgs([{ role: "model", text: "Chat cleared. How can I help next? 🐘" }]);
    setConversationId(null);
    setError("");
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-[1000] rounded-full p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl hover:scale-105 transition-all"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[1000] w-[90vw] max-w-md h-[70vh] bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
            <div className="font-semibold">{title}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-white/20 transition"
                title="Clear conversation"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/20 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={boxRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-emerald-50/50 to-white">
            {msgs.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking…
              </div>
            )}
            {!!error && (
              <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md p-2">{error}</div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex items-center gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type your question…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            <div className="mt-1 text-[10px] text-gray-400">
              Powered by Gemini • Avoid sharing sensitive data.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-6 shadow
          ${isUser ? "bg-emerald-600 text-white rounded-br-sm" : "bg-white border border-emerald-100 text-gray-800 rounded-bl-sm"}`}
        dangerouslySetInnerHTML={{ __html: toHtml(text) }}
      />
    </div>
  );
}

// ultra-light markdown-ish to HTML (bold/italics/links/newlines)
function toHtml(s = "") {
  let t = s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/`([^`]+)`/g, "<code class='px-1 py-0.5 bg-gray-100 rounded'>$1</code>");
  t = t.replace(/(https?:\/\/[^\s)]+)(\))/g, "$1)$2"); // simple guard
  t = t.replace(/(https?:\/\/[^\s<]+)/g, "<a class='text-emerald-700 underline' target='_blank' rel='noreferrer'>$1</a>");
  t = t.replace(/\n/g, "<br/>");
  return t;
}

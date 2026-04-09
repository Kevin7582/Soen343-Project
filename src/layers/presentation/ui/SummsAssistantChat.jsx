import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAssistantReply } from '../../service-layer/summsAssistantService';

function chatHistory(msgs) {
  return msgs.filter((x) => x.role === 'user' || x.role === 'assistant');
}

const QUICK_PROMPTS = [
  'How do I reserve a scooter?',
  'Where is parking?',
  'STM / transit help',
  'Set my preferences',
];

function formatAssistantText(text) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function SummsAssistantChat() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      text: 'Type a question below—the assistant will answer here.',
    },
  ]);
  const listRef = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = useCallback(
    async (raw) => {
      const text = (raw ?? input).trim();
      if (!text || loading) return;
      setInput('');
      const history = chatHistory(messagesRef.current);
      setMessages((m) => [...m, { role: 'user', text }]);
      setLoading(true);
      try {
        const reply = await getAssistantReply(history, text, {
          role: user?.role,
          isAuthenticated,
        });
        setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      } catch {
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: 'Something went wrong. Please try again in a moment.' },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, user?.role, isAuthenticated]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="summs-chat-root" aria-live="polite">
      {open && (
        <div className="summs-chat-panel fade-up" role="dialog" aria-label="SUMMS mobility assistant">
          <div className="summs-chat-header">
            <div>
              <div className="summs-chat-title">SUMMS Assistant</div>
              <div className="summs-chat-sub">In-app help</div>
            </div>
            <button
              type="button"
              className="summs-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="summs-chat-quick">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="summs-chat-chip"
                onClick={() => send(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="summs-chat-messages" ref={listRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`summs-chat-bubble summs-chat-bubble--${msg.role}`}
              >
                <div className="summs-chat-bubble-inner">
                  {msg.role === 'assistant' ? formatAssistantText(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="summs-chat-bubble summs-chat-bubble--assistant">
                <div className="summs-chat-bubble-inner summs-chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form className="summs-chat-form" onSubmit={onSubmit}>
            <input
              className="summs-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about SUMMS…"
              disabled={loading}
              maxLength={500}
              aria-label="Message"
            />
            <button type="submit" className="btn btn-primary summs-chat-send" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`summs-chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close assistant' : 'Open SUMMS assistant'}
      >
        {open ? '×' : '✦'}
      </button>
    </div>
  );
}

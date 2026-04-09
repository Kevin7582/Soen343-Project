/**
 * SUMMS in-app assistant — OpenAI only (no scripted reply fallback).
 *
 * - OPENAI_API_KEY in `.env`: Vite dev/preview proxy at `/api/openai/*` (key stays off the client).
 * - VITE_OPENAI_API_KEY: browser calls OpenAI directly (key is in the bundle).
 * - VITE_OPENAI_MODEL: optional, default gpt-4o-mini.
 *
 * Optional: VITE_SUMMS_ASSISTANT_URL — POST { messages } -> { reply } (e.g. another LLM backend).
 */

const SUMMS_CONTEXT = `SUMMS (Smart Urban Mobility Management) is one app for getting around the city. Citizens use **Dashboard** (overview, service alerts, map, shortcuts), **For You** (personal suggestions), **Mobility** (BIXI stations and scooter/bike rentals on the map), **Parking** (find and reserve spots), **Transit** (STM metro line status and trip planning on the in-app map), **Analytics**, **Active Rental** (current trip), and **Profile** (preferences). Providers use **Home**, **Vehicles**, and **Rentals**. Admins use analytics and monitoring tabs in the sidebar. The map is built into SUMMS—describe it as "the map" or "the Transit map," not as an external product.`;

const ASSISTANT_UNAVAILABLE =
  "Sorry—the assistant isn't available right now. Please try again in a moment.";

const OPENAI_MODEL = () => import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

function buildOpenAiMessages(history, userText, ctx) {
  const roleHint =
    ctx.role && ctx.isAuthenticated
      ? ` The user is signed in; their account type in the app is "${ctx.role}".`
      : ctx.isAuthenticated
        ? ''
        : ' The user may be on the sign-in screen.';
  const system = `You are SUMMS's in-app help assistant—the chatbot users talk to inside the SUMMS app.${roleHint}

Voice: friendly, clear, and practical, like product support. Use "you" and "the app." Use **bold** only for tab or screen names (e.g. **Mobility**, **Parking**).

Rules:
- Answer only as this in-app assistant. Do not mention external map vendors, API keys, databases, backends, proxies, configuration files, build tools, repositories, or any technical stack—users should only hear about SUMMS screens and actions.
- If trip planning or maps come up, say users plan trips on the map in **Transit** or see vehicles and stations on the map in **Mobility** / **Parking**—always as part of SUMMS, never as a separate product.
- If something might be unavailable, say to try again later, check **Profile**, or use another tab—never tell users to edit configuration or developer setup.
- Stay under about 150 words unless the user asks for more detail. If unsure, suggest the most relevant sidebar tab.

What SUMMS offers: ${SUMMS_CONTEXT}`;

  const msgs = [{ role: 'system', content: system }];
  for (const m of history) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    msgs.push({ role: m.role, content: m.text });
  }
  msgs.push({ role: 'user', content: userText });
  return msgs;
}

/**
 * @param {ReturnType<typeof buildOpenAiMessages>} messages
 * @returns {Promise<string | null>}
 */
async function fetchOpenAiCompletion(messages) {
  const body = JSON.stringify({
    model: OPENAI_MODEL(),
    messages,
    max_tokens: 500,
    temperature: 0.65,
  });
  const headers = { 'Content-Type': 'application/json' };

  const viteKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (viteKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { ...headers, Authorization: `Bearer ${viteKey}` },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // try proxy next
    }
  }

  try {
    const res = await fetch('/api/openai/chat/completions', {
      method: 'POST',
      headers,
      body,
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch {
    // no proxy
  }

  return null;
}

/**
 * @param {Array<{ role: 'user' | 'assistant', text: string }>} history
 * @param {string} userText
 * @param {{ role?: string, isAuthenticated?: boolean }} ctx
 * @returns {Promise<string>}
 */
export async function getAssistantReply(history, userText, ctx = {}) {
  const openAiMessages = buildOpenAiMessages(history, userText, ctx);
  const openAiText = await fetchOpenAiCompletion(openAiMessages);
  if (openAiText) return openAiText;

  const url = import.meta.env.VITE_SUMMS_ASSISTANT_URL;
  if (url && typeof url === 'string' && url.startsWith('http')) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', text: userText }].map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Assistant HTTP ${res.status}`);
      const data = await res.json();
      if (data?.reply && typeof data.reply === 'string') {
        const trimmed = data.reply.trim();
        if (trimmed) return trimmed;
      }
    } catch {
      // fall through
    }
  }

  return ASSISTANT_UNAVAILABLE;
}

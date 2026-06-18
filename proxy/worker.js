// Buddy Gemini proxy — a tiny Cloudflare Worker that holds the Gemini API key
// as a server-side secret and forwards requests to Google. The browser calls
// this Worker instead of Google, so the key never ships in the public bundle.
//
// Deploy: see proxy/README.md

const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com";

// Origins allowed to call this proxy (your site + local dev).
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://danielbenedik.github.io",
];

function corsHeaders(origin, request) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  // Reflect whatever headers the browser asks to send. WebKit (Safari/iOS)
  // includes User-Agent in the CORS preflight — a fixed list misses it and the
  // request is blocked. Echoing the requested headers allows it cleanly.
  const requested =
    request && request.headers.get("Access-Control-Request-Headers");
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      requested ||
      "Content-Type, x-goog-api-key, x-goog-api-client, User-Agent",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, request);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const url = new URL(request.url);

    // Only allow Gemini model calls (generateContent / streamGenerateContent).
    if (!url.pathname.startsWith("/v1beta/models/")) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response("Proxy missing GEMINI_API_KEY secret", {
        status: 500,
        headers: cors,
      });
    }

    const target = GEMINI_ORIGIN + url.pathname + url.search;
    const body = await request.text();

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body,
    });

    // Stream the upstream response (SSE for summaries) straight back.
    const headers = new Headers(cors);
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "application/json",
    );
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

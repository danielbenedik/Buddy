// Buddy proxy — a tiny Cloudflare Worker that holds API keys as server-side
// secrets so they never ship in the public bundle. It:
//   - forwards Gemini calls (POST /v1beta/models/...) for catalog + stories
//   - looks up movie posters via TMDB (GET /tmdb?query=...&year=...)
//
// Deploy: see proxy/README.md

const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com";
const TMDB_SEARCH = "https://api.themoviedb.org/3/search/movie";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      requested ||
      "Content-Type, x-goog-api-key, x-goog-api-client, User-Agent",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(obj, cors) {
  const headers = new Headers(cors);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(obj), { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, request);
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // Movie posters via TMDB (key stays server-side).
    if (url.pathname === "/tmdb") {
      const query = url.searchParams.get("query");
      if (!query || !env.TMDB_API_KEY) {
        return jsonResponse({ poster: null }, cors);
      }
      const tmdb = new URL(TMDB_SEARCH);
      tmdb.searchParams.set("query", query);
      const year = url.searchParams.get("year");
      if (year) tmdb.searchParams.set("year", year);
      tmdb.searchParams.set("api_key", env.TMDB_API_KEY);
      try {
        const res = await fetch(tmdb.toString());
        const data = await res.json();
        const path = data.results && data.results[0] && data.results[0].poster_path;
        return jsonResponse(
          { poster: path ? `${TMDB_IMAGE}${path}` : null },
          cors,
        );
      } catch {
        return jsonResponse({ poster: null }, cors);
      }
    }

    // Everything below is the Gemini forward (POST only).
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

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

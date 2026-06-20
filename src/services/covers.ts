import { getCached, setCached } from "../utils/cache";
import { cacheKeys, COVER_TTL } from "../utils/constants";

import type { Book } from "../types/catalog";

const OL_SEARCH = "https://openlibrary.org/search.json";
const OL_COVERS = "https://covers.openlibrary.org/b";
const ITUNES_SEARCH = "https://itunes.apple.com/search";
// Movie posters go through the Worker (TMDB key stays server-side).
const PROXY_URL = process.env.REACT_APP_GEMINI_PROXY_URL;

// --- Books: Open Library ---
interface OLResponse {
  docs?: Array<{ cover_i?: number; cover_edition_key?: string }>;
}

function olCover(doc?: {
  cover_i?: number;
  cover_edition_key?: string;
}): string {
  if (doc?.cover_i) {
    return `${OL_COVERS}/id/${doc.cover_i}-L.jpg?default=false`;
  }
  if (doc?.cover_edition_key) {
    return `${OL_COVERS}/olid/${doc.cover_edition_key}-L.jpg?default=false`;
  }
  return "";
}

async function fetchBookCover(book: Book): Promise<string> {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
    limit: "1",
    fields: "cover_i,cover_edition_key",
  });
  const res = await fetch(`${OL_SEARCH}?${params.toString()}`);
  if (!res.ok) return "";
  const json = (await res.json()) as OLResponse;
  return olCover(json.docs?.[0]);
}

// --- Movies & songs: iTunes Search (no key; CORS-friendly) ---
interface ITunesResponse {
  results?: Array<{ artworkUrl100?: string }>;
}

async function fetchSongArtwork(book: Book): Promise<string> {
  const params = new URLSearchParams({
    term: `${book.title} ${book.author}`,
    entity: "song",
    limit: "1",
  });
  const res = await fetch(`${ITUNES_SEARCH}?${params.toString()}`);
  if (!res.ok) return "";
  const json = (await res.json()) as ITunesResponse;
  const art = json.results?.[0]?.artworkUrl100 ?? "";
  // Upsize the thumbnail to a sharp cover.
  return art ? art.replace("100x100", "600x600") : "";
}

// --- Movies: TMDB via the Worker proxy (key stays server-side) ---
interface TmdbResponse {
  poster?: string | null;
}

async function fetchMoviePoster(book: Book): Promise<string> {
  if (!PROXY_URL) return ""; // no proxy configured → fall back to the tile
  const params = new URLSearchParams({ query: book.title });
  if (book.year) params.set("year", String(book.year));
  const res = await fetch(`${PROXY_URL}/tmdb?${params.toString()}`);
  if (!res.ok) return "";
  const json = (await res.json()) as TmdbResponse;
  return json.poster ?? "";
}

export async function fetchCoverUrl(book: Book): Promise<string | null> {
  const cacheKey = cacheKeys.cover(book.id);
  const cached = getCached<string>(cacheKey);
  if (cached !== null) return cached || null;

  try {
    let url = "";
    if (book.media === "book") {
      url = await fetchBookCover(book);
    } else if (book.media === "song") {
      url = await fetchSongArtwork(book);
    } else {
      url = await fetchMoviePoster(book);
    }
    setCached(cacheKey, url, COVER_TTL);
    return url || null;
  } catch {
    return null;
  }
}

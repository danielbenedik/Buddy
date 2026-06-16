import { getCached, setCached } from "../utils/cache";
import { cacheKeys, COVER_TTL } from "../utils/constants";

import type { Book } from "../types/catalog";

const SEARCH_API = "https://openlibrary.org/search.json";
const COVERS_BASE = "https://covers.openlibrary.org/b";

interface SearchResponse {
  docs?: Array<{ cover_i?: number; cover_edition_key?: string }>;
}

function coverFromDoc(doc?: {
  cover_i?: number;
  cover_edition_key?: string;
}): string {
  if (doc?.cover_i) {
    return `${COVERS_BASE}/id/${doc.cover_i}-L.jpg?default=false`;
  }
  if (doc?.cover_edition_key) {
    return `${COVERS_BASE}/olid/${doc.cover_edition_key}-L.jpg?default=false`;
  }
  return "";
}

export async function fetchCoverUrl(book: Book): Promise<string | null> {
  const cacheKey = cacheKeys.cover(book.id);
  const cached = getCached<string>(cacheKey);
  if (cached !== null) return cached || null;

  try {
    const params = new URLSearchParams({
      title: book.title,
      author: book.author,
      limit: "1",
      fields: "cover_i,cover_edition_key",
    });
    const res = await fetch(`${SEARCH_API}?${params.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as SearchResponse;
    const url = coverFromDoc(json.docs?.[0]);
    setCached(cacheKey, url, COVER_TTL);
    return url || null;
  } catch {
    return null;
  }
}

import { GoogleGenAI, Type } from "@google/genai";

import { getCached, setCached } from "../utils/cache";
import { mapLimit } from "../utils/concurrency";
import {
  BOOKS_PER_GENRE,
  cacheKeys,
  catalogPrompt,
  FUNFACT_TTL,
  funFactPrompt,
  GENRE_COUNT,
  genrePrompt,
  MODEL_ID,
  SEARCH_TTL,
  searchPrompt,
  summaryPrompt,
} from "../utils/constants";

import { fetchCoverUrl } from "./covers";

import type {
  Book,
  Catalog,
  Genre,
  Lang,
  MediaType,
  ReadingTime,
} from "../types/catalog";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
const proxyUrl = process.env.REACT_APP_GEMINI_PROXY_URL;

// When a proxy URL is set (the deployed site), route Gemini calls through it
// so the real key stays server-side. With no proxy (local dev) we call Gemini
// directly using the key from .env.local.
const ai = new GoogleGenAI(
  proxyUrl
    ? { apiKey: "proxy", httpOptions: { baseUrl: proxyUrl } }
    : { apiKey: apiKey ?? "" },
);

const isConfigured = Boolean(proxyUrl || apiKey);

const entrySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    titleHe: { type: Type.STRING },
    authorHe: { type: Type.STRING },
    year: { type: Type.INTEGER },
  },
  required: ["title", "author", "titleHe", "authorHe"],
};

const catalogSchema = {
  type: Type.OBJECT,
  properties: {
    hero: entrySchema,
    firstGenre: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING },
        books: { type: Type.ARRAY, items: entrySchema },
      },
      required: ["label", "books"],
    },
    otherGenres: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["hero", "firstGenre", "otherGenres"],
};

interface RawEntry {
  title: string;
  author: string;
  titleHe: string;
  authorHe: string;
  year?: number;
}

interface RawCatalog {
  hero: RawEntry;
  firstGenre: { label: string; books: RawEntry[] };
  otherGenres: string[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toBook(entry: RawEntry, media: MediaType): Book {
  return {
    id: slugify(`${entry.title}-${entry.author}`),
    media,
    title: entry.title,
    author: entry.author,
    titleHe: entry.titleHe || entry.title,
    authorHe: entry.authorHe || entry.author,
    year: entry.year,
  };
}

export function hasApiKey(): boolean {
  return isConfigured;
}

export async function getCatalog(media: MediaType): Promise<Catalog> {
  if (!isConfigured) {
    throw new Error(
      "Missing REACT_APP_GEMINI_API_KEY or REACT_APP_GEMINI_PROXY_URL",
    );
  }

  // Random seed + high temperature so each (daily) regeneration yields a
  // genuinely different set of books rather than the same predictable list.
  const seed = Math.random().toString(36).slice(2, 10);
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: catalogPrompt(media, seed),
    config: {
      responseMimeType: "application/json",
      responseSchema: catalogSchema,
      temperature: 1.3,
    },
  });

  const raw = JSON.parse(response.text ?? "{}") as RawCatalog;

  const hero = toBook(raw.hero, media);
  const firstBooks = raw.firstGenre.books
    .slice(0, BOOKS_PER_GENRE)
    .map((e) => toBook(e, media));
  const firstGenre: Genre = {
    id: slugify(raw.firstGenre.label),
    label: raw.firstGenre.label,
    books: firstBooks,
  };
  // Remaining genres are label-only; their books load on demand when expanded.
  const lazyGenres: Genre[] = (raw.otherGenres ?? [])
    .slice(0, GENRE_COUNT - 1)
    .map((label) => ({ id: slugify(label), label, books: [] }));

  // Only fetch covers for the hero + first genre, so the initial load is fast.
  const withCovers = [hero, ...firstBooks];
  const covers = await mapLimit(withCovers, 6, fetchCoverUrl);
  const coverById = new Map<string, string>();
  withCovers.forEach((book, i) => {
    const url = covers[i];
    if (url) coverById.set(book.id, url);
  });

  const applyCover = (book: Book): Book => {
    const url = coverById.get(book.id);
    return url ? { ...book, coverUrl: url } : book;
  };

  return {
    media,
    hero: applyCover(hero),
    genres: [
      { ...firstGenre, books: firstGenre.books.map(applyCover) },
      ...lazyGenres,
    ],
  };
}

const searchSchema = {
  type: Type.OBJECT,
  properties: {
    results: { type: Type.ARRAY, items: entrySchema },
  },
  required: ["results"],
};

export async function generateGenreBooks(
  media: MediaType,
  label: string,
  avoid: string[],
): Promise<Book[]> {
  if (!isConfigured) {
    throw new Error(
      "Missing REACT_APP_GEMINI_API_KEY or REACT_APP_GEMINI_PROXY_URL",
    );
  }

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: genrePrompt(media, label, avoid),
    config: {
      responseMimeType: "application/json",
      responseSchema: searchSchema,
      temperature: 1.3,
    },
  });

  const raw = JSON.parse(response.text ?? '{"results":[]}') as {
    results: RawEntry[];
  };
  const books = (raw.results ?? [])
    .slice(0, BOOKS_PER_GENRE)
    .map((e) => toBook(e, media));

  const covers = await mapLimit(books, 6, fetchCoverUrl);
  return books.map((book, i) => {
    const url = covers[i];
    return url ? { ...book, coverUrl: url } : book;
  });
}

export async function searchTitles(
  media: MediaType,
  query: string,
): Promise<Book[]> {
  if (!isConfigured) {
    throw new Error(
      "Missing REACT_APP_GEMINI_API_KEY or REACT_APP_GEMINI_PROXY_URL",
    );
  }

  const cacheKey = cacheKeys.search(media, query);
  const cached = getCached<Book[]>(cacheKey);
  if (cached) return cached;

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: searchPrompt(media, query),
    config: {
      responseMimeType: "application/json",
      responseSchema: searchSchema,
    },
  });

  const raw = JSON.parse(response.text ?? '{"results":[]}') as {
    results: RawEntry[];
  };
  // Follow the query language: a Hebrew query stays Hebrew, anything else
  // (English/Latin) shows results and the summary in English.
  const lang: Lang = /[֐-׿]/.test(query) ? "he" : "en";
  const books = (raw.results ?? [])
    .slice(0, 3)
    .map((e) => ({ ...toBook(e, media), lang }));
  setCached(cacheKey, books, SEARCH_TTL);
  return books;
}

export async function getFunFact(): Promise<string> {
  if (!isConfigured) {
    throw new Error(
      "Missing REACT_APP_GEMINI_API_KEY or REACT_APP_GEMINI_PROXY_URL",
    );
  }

  const now = new Date();
  const cacheKey = cacheKeys.funFact(`${now.getMonth() + 1}-${now.getDate()}`);
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const dateLabel = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: funFactPrompt(dateLabel),
  });
  const fact = (response.text ?? "").trim();
  if (fact) setCached(cacheKey, fact, FUNFACT_TTL);
  return fact;
}

export async function* generateSummaryStream(
  book: Book,
  minutes: ReadingTime,
): AsyncGenerator<string> {
  if (!isConfigured) {
    throw new Error(
      "Missing REACT_APP_GEMINI_API_KEY or REACT_APP_GEMINI_PROXY_URL",
    );
  }

  const stream = await ai.models.generateContentStream({
    model: MODEL_ID,
    contents: summaryPrompt(book, minutes),
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

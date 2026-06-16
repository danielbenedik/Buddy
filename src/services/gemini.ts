import { GoogleGenAI, Type } from "@google/genai";

import { mapLimit } from "../utils/concurrency";
import {
  BOOKS_PER_GENRE,
  catalogPrompt,
  GENRE_COUNT,
  MODEL_ID,
  summaryPrompt,
} from "../utils/constants";

import { fetchCoverUrl } from "./covers";

import type { Book, Catalog, Genre, MediaType } from "../types/catalog";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

const entrySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    year: { type: Type.INTEGER },
  },
  required: ["title", "author"],
};

const catalogSchema = {
  type: Type.OBJECT,
  properties: {
    hero: entrySchema,
    genres: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          books: { type: Type.ARRAY, items: entrySchema },
        },
        required: ["label", "books"],
      },
    },
  },
  required: ["hero", "genres"],
};

interface RawEntry {
  title: string;
  author: string;
  year?: number;
}

interface RawCatalog {
  hero: RawEntry;
  genres: Array<{ label: string; books: RawEntry[] }>;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toBook(entry: RawEntry): Book {
  return {
    id: slugify(`${entry.title}-${entry.author}`),
    title: entry.title,
    author: entry.author,
    year: entry.year,
  };
}

export function hasApiKey(): boolean {
  return Boolean(apiKey);
}

export async function getCatalog(media: MediaType): Promise<Catalog> {
  if (!apiKey) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: catalogPrompt(media),
    config: {
      responseMimeType: "application/json",
      responseSchema: catalogSchema,
    },
  });

  const raw = JSON.parse(response.text ?? "{}") as RawCatalog;

  const genres: Genre[] = raw.genres.slice(0, GENRE_COUNT).map((genre) => ({
    id: slugify(genre.label),
    label: genre.label,
    books: genre.books.slice(0, BOOKS_PER_GENRE).map(toBook),
  }));
  const hero = toBook(raw.hero);

  // Resolve covers with capped concurrency — firing all at once makes Open
  // Library throttle the burst and most lookups come back empty.
  const allBooks = [hero, ...genres.flatMap((g) => g.books)];
  const covers = await mapLimit(allBooks, 6, fetchCoverUrl);
  const coverById = new Map<string, string>();
  allBooks.forEach((book, i) => {
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
    genres: genres.map((genre) => ({
      ...genre,
      books: genre.books.map(applyCover),
    })),
  };
}

export async function* generateSummaryStream(
  book: Book,
): AsyncGenerator<string> {
  if (!apiKey) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }

  const stream = await ai.models.generateContentStream({
    model: MODEL_ID,
    contents: summaryPrompt(book),
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

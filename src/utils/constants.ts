import type { Book, MediaType } from "../types/catalog";

export const MODEL_ID = "gemini-2.5-flash";

export const GENRE_COUNT = 5;
export const BOOKS_PER_GENRE = 7;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const CATALOG_TTL = DAY;
export const SUMMARY_TTL = 7 * DAY;
export const COVER_TTL = 30 * DAY;

export const cacheKeys = {
  catalog: (media: MediaType) => `buddy:catalog:${media}`,
  summary: (bookId: string) => `buddy:summary:${bookId}`,
  cover: (bookId: string) => `buddy:cover:${bookId}`,
};

export function catalogPrompt(media: MediaType): string {
  const noun = media === "book" ? "books" : "movies";
  const creator = media === "book" ? "author" : "director";
  return [
    `Build a catalog of well-known ${noun} for a Netflix-style browsing app.`,
    `Return exactly ${GENRE_COUNT} distinct genres.`,
    `Each genre must contain exactly ${BOOKS_PER_GENRE} famous, real, widely-recognized ${noun}.`,
    `Also pick one separate, very famous "hero" ${media} to feature at the top.`,
    `Prefer iconic, popular titles people will recognize. Avoid duplicates across genres.`,
    `For each entry give the title, the ${creator}, and the release year.`,
  ].join(" ");
}

export function summaryPrompt(book: Book): string {
  return [
    `Write an engaging, spoiler-aware summary of the book "${book.title}"`,
    `by ${book.author}.`,
    `Target about 300-350 words — roughly a one-page, two-minute read.`,
    `Use plain, flowing prose with no headings, no bullet points, and no preamble.`,
    `Start directly with the summary.`,
  ].join(" ");
}

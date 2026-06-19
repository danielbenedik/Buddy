import type { Book, MediaType, ReadingTime } from "../types/catalog";

export const MODEL_ID = "gemini-2.5-flash";

export const GENRE_COUNT = 5;
export const BOOKS_PER_GENRE = 7;

export const READING_TIMES: ReadingTime[] = [2, 5];

// Approximate Hebrew word budget per reading time (~150 wpm).
const WORDS_BY_TIME: Record<ReadingTime, number> = {
  2: 500,
  5: 1000,
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const CATALOG_TTL = DAY;
export const SUMMARY_TTL = 7 * DAY;
export const COVER_TTL = 30 * DAY;
export const SEARCH_TTL = 7 * DAY;

export const cacheKeys = {
  catalog: (media: MediaType) => `buddy:catalog:${media}`,
  // Keyed by media + reading time + "he" so each variant is cached separately.
  summary: (media: MediaType, bookId: string, minutes: ReadingTime) =>
    `buddy:summary:${media}:he:${minutes}:${bookId}`,
  cover: (bookId: string) => `buddy:cover:${bookId}`,
  search: (media: MediaType, query: string) =>
    `buddy:search:${media}:${query.trim().toLowerCase()}`,
};

export function catalogPrompt(media: MediaType, seed: string): string {
  const noun = media === "book" ? "books" : "movies";
  const creator = media === "book" ? "author" : "director";
  return [
    `Build a catalog of well-known ${noun} for a Netflix-style browsing app.`,
    `Return exactly ${GENRE_COUNT} genres.`,
    `The FIRST genre is essential, popular must-${media === "book" ? "read" : "watch"} ${noun} —`,
    `label it "${media === "book" ? "Must-Read Favorites" : "Must-Watch Favorites"}".`,
    `The other ${GENRE_COUNT - 1} genres should be distinct, recognizable categories,`,
    `rotated and varied from the usual defaults.`,
    `Each genre must contain exactly ${BOOKS_PER_GENRE} famous, real, widely-recognized ${noun}.`,
    `Also pick one separate, very famous "hero" ${media} to feature at the top.`,
    `Variation token: ${seed}. Produce a FRESH, genuinely different selection this`,
    `time — do NOT default to the same predictable titles; rotate the genres and`,
    `blend timeless classics with less-obvious but well-regarded works.`,
    `Avoid duplicates across genres.`,
    `Genre labels must be in English or Hebrew.`,
    `For each entry provide: the original title and ${creator} in English (for`,
    `lookup), the title translated to Hebrew (titleHe), the ${creator} name in`,
    `Hebrew (authorHe), and the release year.`,
  ].join(" ");
}

export function searchPrompt(media: MediaType, query: string): string {
  const noun = media === "book" ? "books" : "movies";
  const creator = media === "book" ? "author" : "director";
  return [
    `A user is searching for a ${media} with the query: "${query}".`,
    `Return up to 3 real, well-known ${noun} that best match the query by title,`,
    `${creator}, series, or topic. For a series, include the most relevant entries.`,
    `For each entry provide: the original title and ${creator} in English (for lookup),`,
    `the title in Hebrew (titleHe), the ${creator} in Hebrew (authorHe), and the year.`,
    `Return an empty list if nothing matches.`,
  ].join(" ");
}

export function genrePrompt(
  media: MediaType,
  label: string,
  avoid: string[],
): string {
  const noun = media === "book" ? "books" : "movies";
  const creator = media === "book" ? "author" : "director";
  return [
    `List exactly ${BOOKS_PER_GENRE} famous, real, widely-recognized ${noun}`,
    `in the genre "${label}".`,
    avoid.length
      ? `Do NOT include any of these (already shown): ${avoid.join("; ")}.`
      : "",
    `Bring a fresh, different set of well-known titles.`,
    `For each entry provide: the original title and ${creator} in English (for`,
    `lookup), the title in Hebrew (titleHe), the ${creator} in Hebrew (authorHe),`,
    `and the release year.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function summaryPrompt(book: Book, minutes: ReadingTime): string {
  const words = WORDS_BY_TIME[minutes];
  const subject =
    book.media === "book"
      ? `הספר "${book.title}" מאת ${book.author}`
      : `הסרט "${book.title}" בבימוי ${book.author}`;
  return [
    `ספר לי מחדש את הסיפור של ${subject}.`,
    `אל תכתוב סיכום ניתוחי או ביקורת — ספר את העלילה עצמה בקצרה בצורת סיפור כאילו אני קורא את הסיפור רק בצורתו הקצרה,`,
    `תעשה את זה זורם מההתחלה ועד הסוף, עם האירועים המרכזיים והתפניות החשובות`,
    `לפי סדר התרחשותם.`,
    `כתוב בעברית בלבד, בערך ${words} מילים (קריאה של כ-${minutes} דקות).`,
    `התחל ישר בסיפור, בלי כותרות, בלי נקודות, ובלי הקדמות.`,
  ].join(" ");
}

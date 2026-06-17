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

export const cacheKeys = {
  catalog: (media: MediaType) => `buddy:catalog:${media}`,
  // Keyed by reading time + "he" so each length/language is cached separately.
  summary: (bookId: string, minutes: ReadingTime) =>
    `buddy:summary:he:${minutes}:${bookId}`,
  cover: (bookId: string) => `buddy:cover:${bookId}`,
};

export function catalogPrompt(media: MediaType): string {
  const noun = media === "book" ? "books" : "movies";
  const creator = media === "book" ? "author" : "director";
  return [
    `Build a catalog of well-known ${noun} for a Netflix-style browsing app.`,
    `Return exactly ${GENRE_COUNT} genres.`,
    `The FIRST genre must be the essential, most popular must-read ${noun} that`,
    `everyone should read at least once — label it "Must-Read Favorites".`,
    `The other ${GENRE_COUNT - 1} genres should be distinct, recognizable categories.`,
    `Each genre must contain exactly ${BOOKS_PER_GENRE} famous, real, widely-recognized ${noun}.`,
    `Also pick one separate, very famous "hero" ${media} to feature at the top.`,
    `Avoid duplicates across genres.`,
    `Genre labels must be in English or Hebrew.`,
    `For each entry provide: the original title and ${creator} in English (for`,
    `lookup), the title translated to Hebrew (titleHe), the ${creator} name in`,
    `Hebrew (authorHe), and the release year.`,
  ].join(" ");
}

export function summaryPrompt(book: Book, minutes: ReadingTime): string {
  const words = WORDS_BY_TIME[minutes];
  return [
    `ספר לי מחדש את הסיפור של הספר "${book.title}" מאת ${book.author}.`,
    `אל תכתוב סיכום ניתוחי או ביקורת — ספר את העלילה עצמה בקצרה בצורת סיפור כאילו אני קורא את הסיפור רק בצורתו הקצרה,`,
    `תעשה את זה זורם מההתחלה ועד הסוף, עם האירועים המרכזיים והתפניות החשובות`,
    `לפי סדר התרחשותם.`,
    `כתוב בעברית בלבד, בערך ${words} מילים (קריאה של כ-${minutes} דקות).`,
    `התחל ישר בסיפור, בלי כותרות, בלי נקודות, ובלי הקדמות.`,
  ].join(" ");
}

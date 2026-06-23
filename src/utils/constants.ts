import type { Book, Lang, MediaType, ReadingTime } from "../types/catalog";

export const MODEL_ID = "gemini-2.5-flash";

export const GENRE_COUNT = 5;
export const BOOKS_PER_GENRE = 7;

export const READING_TIMES: ReadingTime[] = [2, 5];

// Approximate Hebrew word budget per reading time (~150 wpm).
const WORDS_BY_TIME: Record<ReadingTime, number> = {
  2: 500,
  5: 1000,
};

interface MediaInfo {
  noun: string; // plural English noun used in prompts
  creator: string; // author / director / artist
  mustLabel: string; // label for the featured first genre
}

const MEDIA_INFO: Record<MediaType, MediaInfo> = {
  book: { noun: "books", creator: "author", mustLabel: "Must-Read Favorites" },
  movie: {
    noun: "movies",
    creator: "director",
    mustLabel: "Must-Watch Favorites",
  },
  song: {
    noun: "songs",
    creator: "artist",
    mustLabel: "Must-Listen Favorites",
  },
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const CATALOG_TTL = DAY;
export const SUMMARY_TTL = 7 * DAY;
export const COVER_TTL = 30 * DAY;
export const SEARCH_TTL = 7 * DAY;
export const FUNFACT_TTL = DAY;

export const cacheKeys = {
  catalog: (media: MediaType) => `buddy:catalog:${media}`,
  // Keyed by media + reading time + "he" so each variant is cached separately.
  summary: (
    media: MediaType,
    bookId: string,
    minutes: ReadingTime,
    lang: Lang,
  ) => `buddy:summary:${media}:${lang}:${minutes}:${bookId}`,
  cover: (bookId: string) => `buddy:cover:${bookId}`,
  search: (media: MediaType, query: string) =>
    `buddy:search:${media}:${query.trim().toLowerCase()}`,
  funFact: (dateKey: string) => `buddy:funfact:${dateKey}`,
};

export function funFactPrompt(dateLabel: string): string {
  return [
    `תן לי עובדה אחת קצרה, מעניינת ומפתיעה (משפט אחד עד שניים) על התאריך`,
    `${dateLabel} — אירוע היסטורי מפורסם, המצאה, או דבר מוזר שקרה ביום הזה.`,
    `ענה בעברית בלבד, רק העובדה עצמה, בלי הקדמות ובלי כותרת.`,
  ].join(" ");
}

export function catalogPrompt(media: MediaType, seed: string): string {
  const { noun, creator, mustLabel } = MEDIA_INFO[media];
  return [
    `Build a catalog of well-known ${noun} for a Netflix-style browsing app.`,
    `Pick one very famous "hero" ${media} to feature at the top.`,
    `Then build the FIRST genre — the essential, most popular must-experience`,
    `${noun}, labeled "${mustLabel}" — and fully list exactly ${BOOKS_PER_GENRE}`,
    `famous, real, widely-recognized ${noun} for it.`,
    `Also propose ${GENRE_COUNT - 1} more distinct, recognizable genre labels`,
    `(names only — do NOT list ${noun} for these).`,
    `Variation token: ${seed}. Produce a FRESH, genuinely different selection`,
    `each time — rotate the genres and picks; avoid the same predictable titles.`,
    `Genre labels may be in English or Hebrew.`,
    `For the hero and each entry in the first genre, provide: the original title`,
    `and ${creator} in English (for lookup), the title in Hebrew (titleHe), the`,
    `${creator} in Hebrew (authorHe), and the release year.`,
  ].join(" ");
}

export function searchPrompt(media: MediaType, query: string): string {
  const { noun, creator } = MEDIA_INFO[media];
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
  const { noun, creator } = MEDIA_INFO[media];
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
  const english = book.lang === "en";

  if (book.media === "song") {
    if (english) {
      return [
        `Tell me the story of the song "${book.title}" by ${book.author}.`,
        `Don't write a musical analysis or review — explain what the song is`,
        `about, the story or emotion behind it, the context it was written in,`,
        `and its central message, in flowing, clear prose.`,
        `Write in English only, a reasonable readable length, not too long.`,
        `Start straight with the content — no headings, no bullet points, no preamble.`,
      ].join(" ");
    }
    return [
      `ספר לי את הסיפור של השיר "${book.title}" של ${book.author}.`,
      `אל תכתוב ניתוח מוזיקלי או ביקורת — הסבר על מה השיר מדבר, מה הסיפור או הרגש`,
      `שמאחוריו, ההקשר שבו נכתב, והמסר המרכזי שלו, בצורה זורמת וברורה.`,
      `כתוב בעברית בלבד, באורך סביר וקריא, לא ארוך מדי.`,
      `התחל ישר בתוכן, בלי כותרות, בלי נקודות, ובלי הקדמות.`,
    ].join(" ");
  }

  if (english) {
    const subject =
      book.media === "book"
        ? `the book "${book.title}" by ${book.author}`
        : `the movie "${book.title}" directed by ${book.author}`;
    return [
      `Retell the story of ${subject}.`,
      `Don't write an analytical summary or review — tell the plot itself`,
      `concisely, as a flowing story from beginning to end, with the main`,
      `events and key turning points in the order they happen.`,
      `Write in English only, about ${words} words (about a ${minutes}-minute read).`,
      `Start straight with the story — no headings, no bullet points, no preamble.`,
    ].join(" ");
  }

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

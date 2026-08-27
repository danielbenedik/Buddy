import type { Book, Lang, MediaType, ReadingTime } from "../types/catalog";

export const MODEL_ID = "gemini-2.5-flash";

export const GENRE_COUNT = 5;
export const BOOKS_PER_GENRE = 7;

// --- Guess the Pic ---
export const GUESS_POOL_SIZE = 10;
// Boxes for several subjects are requested in one vision call. Kept small on
// purpose: batching trades tokens for requests, and a large group would pay for
// pictures the player may never reach.
export const BOX_BATCH_SIZE = 3;
// Grid side per picture in the run: the board grows as the run progresses, so
// early pictures are cheap to probe and the last one is the hardest.
export const GUESS_GRID_SIZES = [6, 7, 8, 9, 10];
// A run is a fixed shape (same lengths, same grids) so totals are comparable
// between runs.
export const RUN_LENGTH = GUESS_GRID_SIZES.length;
export function gridSizeFor(pictureNumber: number): number {
  const index = Math.min(Math.max(pictureNumber, 1), RUN_LENGTH) - 1;
  return GUESS_GRID_SIZES[index];
}
// A wrong guess no longer ends the run — it just costs points, priced so it
// always hurts more than revealing a few extra tiles would have.
export const MISS_PENALTY = 15;
// Fibonacci-ish ladder so tile numbers read cleanly instead of 7/4/11/6.
export const COST_LADDER = [1, 2, 3, 5, 8, 13];
// Scaled by tile count: a fixed total would price a 100-tile board at ~1 per
// tile and collapse the whole ladder onto its bottom rung.
export const TARGET_TILE_COST = 3;
// Photos this far from square make a poor board, so their subjects are skipped.
export const MIN_BOARD_ASPECT = 0.5;
export const MAX_BOARD_ASPECT = 2.5;

export const READING_TIMES: ReadingTime[] = [2, 5];

// Catalogs favor the last two decades so the rows stay contemporary.
const RECENT_DECADES_YEARS = 20;

function recentFromYear(): number {
  return new Date().getFullYear() - RECENT_DECADES_YEARS;
}

function recencyRule(noun: string): string {
  return [
    `Keep it MODERN: pick ${noun} released from ${recentFromYear()} onward`,
    `(the last two decades) — contemporary titles, not old classics.`,
    `Only reach further back if a genre genuinely has no notable recent ${noun}.`,
  ].join(" ");
}

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
export const GUESS_POOL_TTL = DAY;
export const GUESS_BOARD_TTL = 30 * DAY;

export const cacheKeys = {
  // v2: catalogs now favor the last two decades — invalidates pre-change caches.
  catalog: (media: MediaType) => `buddy:catalog:v2:${media}`,
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
  guessPool: (dateKey: string) => `buddy:guess:pool:v2:${dateKey}`,
  // Image + bounding boxes are stable per subject, so they outlive the daily
  // pool. v3: stores boxes instead of costs — the grid size now varies per
  // picture, so costs are derived per size at round build time.
  guessBoard: (subjectId: string) => `buddy:guess:board:v3:${subjectId}`,
  // Deliberately not the original `guessBest` key: that held a streak count, and
  // a stored 1 would read as a one-point run nobody could ever beat.
  // v2 carries the date alongside the score, and never expires.
  guessBestRun: "buddy:guess:best-run:v2",
  guessBestRunLegacy: "buddy:guess:best-run:v1",
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
    recencyRule(noun),
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
    recencyRule(noun),
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

export function guessPoolPrompt(seed: string): string {
  return [
    `Pick ${GUESS_POOL_SIZE} subjects for a "guess the picture" game.`,
    `Each subject must be a real, globally famous, VISUALLY recognizable thing`,
    `that has an English Wikipedia article with a good lead photograph —`,
    `landmarks, animals, natural wonders, iconic objects, vehicles, or very`,
    `famous people. No abstract concepts, no events, no logos.`,
    `For each subject provide: the exact English Wikipedia article title`,
    `(wikiTitle — the real article name, e.g. "Eiffel Tower"), the name in`,
    `English (en), the name in Hebrew (he), a short Hebrew category label`,
    `(category, e.g. "אתרים" / "בעלי חיים"), and exactly 3 decoys.`,
    `Decoys are other real, famous subjects from the SAME category that a player`,
    `could plausibly confuse with the answer — give each decoy an English (en)`,
    `and Hebrew (he) name. Decoys must never be the answer itself.`,
    `Variation token: ${seed}. Return a fresh, varied mix of categories and`,
    `difficulty each time — do not repeat the same predictable subjects.`,
  ].join(" ");
}

function boxRules(): string {
  return [
    `"subject": one box tightly around the main subject itself — not the whole`,
    `frame, and not the background.`,
    `"details": 1 to 3 smaller boxes around the specific visual features that`,
    `most give away the subject's identity — the parts a person would recognize`,
    `it by (a distinctive shape, silhouette, pattern, or marking).`,
    `Detail boxes should be tight and lie inside or overlap the subject box.`,
    `If the subject fills the entire frame, still return the tightest box you can.`,
  ].join(" ");
}

// One call covering several photos. Each entry is keyed by a 1-based index so a
// dropped or reordered result can be detected rather than silently mismatched.
export function guessBoxesBatchPrompt(subjects: string[]): string {
  const many = subjects.length > 1;
  return [
    many
      ? `You are given ${subjects.length} images, in order.`
      : `You are given 1 image.`,
    ...subjects.map((s, i) => `Image ${i + 1} shows "${s}".`),
    `For EACH image, return one entry containing its 1-based "index" and 2D`,
    `bounding boxes normalized to 0-1000, as [ymin, xmin, ymax, xmax].`,
    boxRules(),
    many
      ? `Return exactly ${subjects.length} entries, one per image, and never mix`
      : `Return exactly 1 entry.`,
    many
      ? `up boxes between images — entry index N must describe image N.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

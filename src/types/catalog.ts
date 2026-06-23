export type MediaType = "book" | "movie" | "song";

export type ReadingTime = 2 | 5;

export type Lang = "en" | "he";

export interface Book {
  id: string;
  media: MediaType;
  // Display language. Unset = Hebrew (the default for catalog items); English
  // search results are tagged "en" so their UI + summary stay in English.
  lang?: Lang;
  // English title/author (or director) are kept for lookup and a stable slug id.
  title: string;
  author: string;
  // Hebrew display strings shown in the UI.
  titleHe: string;
  authorHe: string;
  year?: number;
  coverUrl?: string;
}

export interface Genre {
  id: string;
  label: string;
  books: Book[];
}

export interface Catalog {
  media: MediaType;
  hero: Book;
  genres: Genre[];
}

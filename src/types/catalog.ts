export type MediaType = "book" | "movie";

export type ReadingTime = 2 | 5;

export interface Book {
  id: string;
  media: MediaType;
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

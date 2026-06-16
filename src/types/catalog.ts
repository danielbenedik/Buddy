export type MediaType = "book" | "movie";

export interface Book {
  id: string;
  title: string;
  author: string;
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

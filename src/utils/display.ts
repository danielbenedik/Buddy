import type { Book } from "../types/catalog";

// Catalog items have no lang (default Hebrew); English search results are "en".
export const isEnglish = (book: Book): boolean => book.lang === "en";

export const displayTitle = (book: Book): string =>
  isEnglish(book) ? book.title : book.titleHe;

export const displayAuthor = (book: Book): string =>
  isEnglish(book) ? book.author : book.authorHe;

export const textDir = (book: Book): "ltr" | "rtl" =>
  isEnglish(book) ? "ltr" : "rtl";

export const textLang = (book: Book): string => (isEnglish(book) ? "en" : "he");

import BookCover from "../BookCover/BookCover";

import styles from "./Card.module.scss";

import type { Book } from "../../types/catalog";

interface CardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

function Card({ book, onSelect }: CardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onSelect(book)}
      aria-label={`${book.title} by ${book.author}`}
    >
      <BookCover
        book={book}
        imgClassName={styles.cover}
        placeholderClassName={styles.placeholder}
      />
    </button>
  );
}

export default Card;

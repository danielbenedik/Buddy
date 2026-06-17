import Card from "../Card/Card";

import styles from "./Row.module.scss";

import type { Book, Genre, ReadingTime } from "../../types/catalog";

interface RowProps {
  genre: Genre;
  onSelect: (book: Book, minutes: ReadingTime) => void;
}

function Row({ genre, onSelect }: RowProps) {
  return (
    <section className={styles.row}>
      <h2 className={styles.label}>{genre.label}</h2>
      <div className={styles.track}>
        {genre.books.map((book) => (
          <Card key={book.id} book={book} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export default Row;

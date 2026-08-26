import { useEffect } from "react";

import { useCatalog } from "../../hooks/useCatalog";
import Hero from "../Hero/Hero";
import Modal from "../Modal/Modal";
import Row from "../Row/Row";
import Skeleton from "../Skeleton/Skeleton";

import styles from "./Catalog.module.scss";

import type { Book, MediaType, ReadingTime } from "../../types/catalog";

interface Selection {
  book: Book;
  minutes: ReadingTime;
}

interface CatalogProps {
  media: MediaType;
  selection: Selection | null;
  onSelectionChange: (selection: Selection | null) => void;
  onLoadingChange: (loading: boolean) => void;
}

function Catalog({
  media,
  selection,
  onSelectionChange,
  onLoadingChange,
}: CatalogProps) {
  const { catalog, loading, error, refreshGenre } = useCatalog(media);

  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  const genreLabel = catalog?.genres.find((g) =>
    g.books.some((b) => b.id === selection?.book.id),
  )?.label;

  const handleSelect = (book: Book, minutes: ReadingTime) =>
    onSelectionChange({ book, minutes });

  return (
    <>
      {loading && <Skeleton />}

      {error && (
        <div className={styles.center}>
          <p>Couldn’t load the catalog.</p>
          <p className={styles.errorDetail}>{error}</p>
        </div>
      )}

      {catalog && (
        <main>
          <Hero book={catalog.hero} onSelect={handleSelect} />
          {catalog.genres.map((genre) => (
            <Row
              key={genre.id}
              genre={genre}
              onSelect={handleSelect}
              onRefresh={refreshGenre}
            />
          ))}
        </main>
      )}

      {selection && (
        <Modal
          book={selection.book}
          minutes={selection.minutes}
          genreLabel={genreLabel}
          onMinutesChange={(minutes) =>
            onSelectionChange({ book: selection.book, minutes })
          }
          onClose={() => onSelectionChange(null)}
        />
      )}
    </>
  );
}

export default Catalog;

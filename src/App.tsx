import { useState } from "react";

import styles from "./app.module.scss";
import Hero from "./components/Hero/Hero";
import Modal from "./components/Modal/Modal";
import Navbar from "./components/Navbar/Navbar";
import Row from "./components/Row/Row";
import { useCatalog } from "./hooks/useCatalog";

import type { Book, MediaType } from "./types/catalog";

function App() {
  const [media, setMedia] = useState<MediaType>("book");
  const [selected, setSelected] = useState<Book | null>(null);
  const { catalog, loading, error } = useCatalog(media);

  const genreLabel = catalog?.genres.find((g) =>
    g.books.some((b) => b.id === selected?.id),
  )?.label;

  return (
    <div className={styles.app}>
      <Navbar media={media} onMediaChange={setMedia} />

      {loading && <div className={styles.center}>Loading your shelf…</div>}

      {error && (
        <div className={styles.center}>
          <p>Couldn’t load the catalog.</p>
          <p className={styles.errorDetail}>{error}</p>
        </div>
      )}

      {catalog && (
        <main>
          <Hero book={catalog.hero} onSelect={setSelected} />
          {catalog.genres.map((genre) => (
            <Row key={genre.id} genre={genre} onSelect={setSelected} />
          ))}
        </main>
      )}

      {selected && (
        <Modal
          book={selected}
          genreLabel={genreLabel}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default App;

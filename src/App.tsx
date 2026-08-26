import { useCallback, useState } from "react";

import styles from "./app.module.scss";
import Catalog from "./components/Catalog/Catalog";
import GuessThePic from "./components/GuessThePic/GuessThePic";
import LoadingFact from "./components/LoadingFact/LoadingFact";
import Navbar from "./components/Navbar/Navbar";

import type { Book, ReadingTime } from "./types/catalog";
import type { AppSection } from "./types/section";

interface Selection {
  book: Book;
  minutes: ReadingTime;
}

function App() {
  const [section, setSection] = useState<AppSection>("guess");
  const [selected, setSelected] = useState<Selection | null>(null);
  // The daily fact stays up until the user dismisses it — it never auto-closes.
  const [factOpen, setFactOpen] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const handleSelect = (book: Book, minutes: ReadingTime) =>
    setSelected({ book, minutes });

  const handleSectionChange = (next: AppSection) => {
    setSelected(null);
    setSection(next);
  };

  const handleLoadingChange = useCallback(
    (loading: boolean) => setCatalogLoading(loading),
    [],
  );

  return (
    <div className={styles.app}>
      <Navbar
        section={section}
        onSectionChange={handleSectionChange}
        onSelect={handleSelect}
      />

      {factOpen && (
        <LoadingFact
          loading={catalogLoading}
          onClose={() => setFactOpen(false)}
        />
      )}

      {section === "guess" ? (
        <GuessThePic />
      ) : (
        <Catalog
          key={section}
          media={section}
          selection={selected}
          onSelectionChange={setSelected}
          onLoadingChange={handleLoadingChange}
        />
      )}
    </div>
  );
}

export default App;

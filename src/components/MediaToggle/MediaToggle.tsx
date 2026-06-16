import styles from "./MediaToggle.module.scss";

import type { MediaType } from "../../types/catalog";

interface MediaToggleProps {
  value: MediaType;
  onChange: (media: MediaType) => void;
}

function MediaToggle({ value, onChange }: MediaToggleProps) {
  return (
    <div className={styles.toggle} role="tablist" aria-label="Media type">
      <button
        type="button"
        role="tab"
        aria-selected={value === "book"}
        className={value === "book" ? styles.active : styles.option}
        onClick={() => onChange("book")}
      >
        Books
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={false}
        className={styles.disabled}
        disabled
        title="Coming soon"
      >
        Movies
      </button>
    </div>
  );
}

export default MediaToggle;

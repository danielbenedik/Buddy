import styles from "./MediaToggle.module.scss";

import type { MediaType } from "../../types/catalog";

interface MediaToggleProps {
  value: MediaType;
  onChange: (media: MediaType) => void;
}

const OPTIONS: { value: MediaType; label: string }[] = [
  { value: "book", label: "Books" },
  { value: "movie", label: "Movies" },
  { value: "song", label: "Songs" },
];

function MediaToggle({ value, onChange }: MediaToggleProps) {
  return (
    <div className={styles.toggle} role="tablist" aria-label="Media type">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? styles.active : styles.option}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default MediaToggle;

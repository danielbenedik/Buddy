import styles from "./SectionToggle.module.scss";

import type { AppSection } from "../../types/section";

interface SectionToggleProps {
  value: AppSection;
  onChange: (section: AppSection) => void;
}

const OPTIONS: { value: AppSection; label: string }[] = [
  { value: "guess", label: "Game" },
  { value: "book", label: "Books" },
  { value: "movie", label: "Movies" },
  { value: "song", label: "Songs" },
];

function SectionToggle({ value, onChange }: SectionToggleProps) {
  return (
    <div className={styles.toggle} role="tablist" aria-label="Section">
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

export default SectionToggle;

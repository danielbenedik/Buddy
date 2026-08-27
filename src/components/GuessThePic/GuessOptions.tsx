import styles from "./GuessOptions.module.scss";

import type { GuessOption } from "../../types/guess";

interface GuessOptionsProps {
  options: GuessOption[];
  onGuess: (option: GuessOption) => void;
}

// Rendered only while a guess is still open — once the picture is settled the
// verdict box takes this component's place.
function GuessOptions({ options, onGuess }: GuessOptionsProps) {
  return (
    <div className={styles.options} dir="rtl" lang="he">
      {options.map((option) => (
        <button
          key={option.en}
          type="button"
          className={styles.option}
          onClick={() => onGuess(option)}
        >
          {option.he}
        </button>
      ))}
    </div>
  );
}

export default GuessOptions;

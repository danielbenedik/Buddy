import styles from "./GuessOptions.module.scss";

import type { GuessOption, GuessStatus } from "../../types/guess";

interface GuessOptionsProps {
  options: GuessOption[];
  answer: GuessOption;
  status: GuessStatus;
  onGuess: (option: GuessOption) => void;
}

function GuessOptions({ options, answer, status, onGuess }: GuessOptionsProps) {
  const done = status !== "playing";

  return (
    <div className={styles.options} dir="rtl" lang="he">
      {options.map((option) => {
        const correct = option.en === answer.en;
        const marked = done && correct ? styles.correct : "";
        return (
          <button
            key={option.en}
            type="button"
            className={`${styles.option} ${marked}`}
            onClick={() => onGuess(option)}
            disabled={done}
          >
            {option.he}
          </button>
        );
      })}
    </div>
  );
}

export default GuessOptions;

import { useEffect, useRef } from "react";

import { useGuessGame } from "../../hooks/useGuessGame";

import GuessBoard from "./GuessBoard";
import GuessOptions from "./GuessOptions";
import styles from "./GuessThePic.module.scss";

function GuessThePic() {
  const {
    round,
    loading,
    error,
    revealed,
    status,
    spent,
    runSpent,
    streak,
    best,
    reveal,
    guess,
    next,
    restart,
  } = useGuessGame();

  const resultRef = useRef<HTMLDivElement>(null);

  // The verdict sits below the board, so on a phone it can land off-screen —
  // bring it into view so the answer is never missed.
  useEffect(() => {
    if (status !== "playing") {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [status]);

  if (error) {
    return (
      <div className={styles.center}>
        <p dir="rtl" lang="he">
          לא הצלחנו לטעון את המשחק.
        </p>
        <p className={styles.errorDetail}>{error}</p>
      </div>
    );
  }

  if (loading || !round) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} aria-hidden="true" />
        <p dir="rtl" lang="he">
          טוען תמונה…
        </p>
      </div>
    );
  }

  return (
    <main className={styles.game}>
      <header className={styles.head} dir="rtl" lang="he">
        <h1 className={styles.title}>נחש את התמונה</h1>
        <p className={styles.sub}>
          חשוף כמה שפחות משבצות — כל משבצת עולה לך נקודות.
        </p>
      </header>

      <div className={styles.stats} dir="rtl" lang="he">
        <span className={styles.stat}>
          <b>{spent}</b> / {round.boardTotal} בסיבוב
        </span>
        <span className={styles.stat}>
          רצף <b>{streak}</b>
        </span>
        <span className={styles.stat}>
          שיא <b>{best}</b>
        </span>
      </div>

      <GuessBoard
        imageUrl={round.imageUrl}
        aspect={round.aspect}
        costs={round.costs}
        revealed={revealed}
        locked={status !== "playing"}
        onReveal={reveal}
      />

      <p className={styles.category} dir="rtl" lang="he">
        {round.subject.category}
      </p>

      <GuessOptions
        options={round.options}
        answer={round.subject.answer}
        status={status}
        onGuess={guess}
      />

      {status !== "playing" && (
        <div className={styles.result} dir="rtl" lang="he" ref={resultRef}>
          {status === "won" ? (
            <>
              <p className={styles.verdict}>
                נכון! {round.subject.answer.he} — {spent} נקודות
              </p>
              <button type="button" className={styles.action} onClick={next}>
                התמונה הבאה
              </button>
            </>
          ) : (
            <>
              <p className={styles.verdict}>
                טעות. זה היה {round.subject.answer.he}.
              </p>
              <p className={styles.runScore}>
                הרצף נגמר — {streak === 1 ? "תמונה אחת" : `${streak} תמונות`},{" "}
                {runSpent + spent} נקודות.
              </p>
              <button type="button" className={styles.action} onClick={restart}>
                סיבוב חדש
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

export default GuessThePic;

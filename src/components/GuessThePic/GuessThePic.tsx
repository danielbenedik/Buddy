import { useEffect, useRef } from "react";

import { useGuessGame } from "../../hooks/useGuessGame";
import { MISS_PENALTY } from "../../utils/constants";

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
    runTotal,
    pictureNumber,
    runLength,
    bestRun,
    isNewRecord,
    lastCorrect,
    reveal,
    guess,
    next,
    restart,
  } = useGuessGame();

  const resultRef = useRef<HTMLDivElement>(null);

  // Once the run has already cost more than the record, beating it is out of
  // reach — worth showing while there's still a run to abandon or push through.
  const overRecord = bestRun !== null && runTotal > bestRun.score;
  const recordDate = bestRun
    ? new Date(bestRun.achievedAt).toLocaleDateString("he-IL", {
        day: "numeric",
        month: "numeric",
        year: "2-digit",
      })
    : null;

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
          תמונה <b>{pictureNumber}</b> מתוך {runLength}
        </span>
        <span className={`${styles.stat} ${overRecord ? styles.over : ""}`}>
          סה״כ <b>{runTotal}</b>
        </span>
        <span className={styles.stat}>
          שיא <b>{bestRun ? bestRun.score : "—"}</b>
          {recordDate && (
            <small className={styles.recordDate}> {recordDate}</small>
          )}
        </span>
      </div>

      {/* Keyed per picture: fresh tiles mount fully covered instead of fading
          in over the previous round's open state, which flashed the new photo. */}
      <GuessBoard
        key={round.subject.id}
        imageUrl={round.imageUrl}
        aspect={round.aspect}
        gridSize={round.gridSize}
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
          {status === "won" && (
            <>
              <p className={styles.verdict}>
                נכון! {round.subject.answer.he} — {spent} נקודות
              </p>
              <p className={styles.runScore}>
                סה״כ בריצה: {runSpent} נקודות · נשארו{" "}
                {runLength - pictureNumber} תמונות.
              </p>
              <button type="button" className={styles.action} onClick={next}>
                התמונה הבאה
              </button>
            </>
          )}

          {status === "finished" && (
            <>
              <p className={styles.verdict}>
                {lastCorrect
                  ? `נכון! ${round.subject.answer.he}. `
                  : `טעות — זה היה ${round.subject.answer.he} (+${MISS_PENALTY} עונש). `}
                סיימת את הריצה! {runSpent} נקודות ל־{runLength} תמונות.
              </p>
              <p className={styles.runScore}>
                {isNewRecord
                  ? "שיא חדש! ככל שהניקוד נמוך יותר — טוב יותר."
                  : `השיא שלך: ${bestRun?.score} נקודות (${recordDate}).`}
              </p>
              <button type="button" className={styles.action} onClick={restart}>
                ריצה חדשה
              </button>
            </>
          )}

          {status === "lost" && (
            <>
              <p className={styles.verdict}>
                טעות. זה היה {round.subject.answer.he} — עונש של {MISS_PENALTY}{" "}
                נקודות.
              </p>
              <p className={styles.runScore}>
                סה״כ בריצה: {runSpent} נקודות · נשארו{" "}
                {runLength - pictureNumber} תמונות.
              </p>
              <button type="button" className={styles.action} onClick={next}>
                התמונה הבאה
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

export default GuessThePic;

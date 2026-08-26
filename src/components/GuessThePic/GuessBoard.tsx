import { GUESS_COLS, GUESS_ROWS } from "../../utils/constants";

import styles from "./GuessBoard.module.scss";

import type { CSSProperties } from "react";

interface GuessBoardProps {
  imageUrl: string;
  aspect: number;
  costs: number[];
  revealed: number[];
  locked: boolean;
  onReveal: (tile: number) => void;
}

function GuessBoard({
  imageUrl,
  aspect,
  costs,
  revealed,
  locked,
  onReveal,
}: GuessBoardProps) {
  return (
    <div
      className={styles.board}
      style={{ "--aspect": aspect } as CSSProperties}
    >
      <img className={styles.photo} src={imageUrl} alt="" />
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${GUESS_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GUESS_ROWS}, 1fr)`,
        }}
      >
        {costs.map((cost, tile) => {
          // Once the round is over the whole picture drops, so the player sees
          // what they were looking at.
          const isOpen = locked || revealed.includes(tile);
          return (
            <button
              key={tile}
              type="button"
              className={`${styles.tile} ${isOpen ? styles.open : ""}`}
              onClick={() => onReveal(tile)}
              disabled={isOpen || locked}
              aria-label={
                isOpen ? "Revealed" : `Reveal this area for ${cost} points`
              }
            >
              {!isOpen && <span className={styles.cost}>{cost}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GuessBoard;

import styles from "./Skeleton.module.scss";

const ROW_COUNT = 3;
const CARD_COUNT = 7;

function Skeleton() {
  return (
    <div aria-hidden="true" aria-busy="true">
      <section className={styles.hero}>
        <div className={styles.heroInfo}>
          <div className={styles.eyebrow} />
          <div className={styles.title} />
          <div className={styles.meta} />
          <div className={styles.want} />
          <div className={styles.buttons}>
            <div className={styles.button} />
            <div className={styles.button} />
          </div>
        </div>
        <div className={styles.heroCover} />
      </section>

      {Array.from({ length: ROW_COUNT }).map((_, row) => (
        <section className={styles.row} key={row}>
          <div className={styles.rowLabel} />
          <div className={styles.track}>
            {Array.from({ length: CARD_COUNT }).map((_, card) => (
              <div className={styles.item} key={card}>
                <div className={styles.chip} />
                <div className={styles.card} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default Skeleton;

import MediaToggle from "../MediaToggle/MediaToggle";

import styles from "./Navbar.module.scss";

import type { MediaType } from "../../types/catalog";

interface NavbarProps {
  media: MediaType;
  onMediaChange: (media: MediaType) => void;
}

function Navbar({ media, onMediaChange }: NavbarProps) {
  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <span className={styles.logo}>BUDDY</span>
        <MediaToggle value={media} onChange={onMediaChange} />
      </div>
      <svg
        className={styles.search}
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
    </header>
  );
}

export default Navbar;

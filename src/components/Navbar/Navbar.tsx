import MediaToggle from "../MediaToggle/MediaToggle";
import Search from "../Search/Search";

import styles from "./Navbar.module.scss";

import type { Book, MediaType, ReadingTime } from "../../types/catalog";

interface NavbarProps {
  media: MediaType;
  onMediaChange: (media: MediaType) => void;
  onSelect: (book: Book, minutes: ReadingTime) => void;
}

function Navbar({ media, onMediaChange, onSelect }: NavbarProps) {
  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <span className={styles.logo}>BUDDY</span>
        <MediaToggle value={media} onChange={onMediaChange} />
      </div>
      <Search media={media} onSelect={onSelect} />
    </header>
  );
}

export default Navbar;

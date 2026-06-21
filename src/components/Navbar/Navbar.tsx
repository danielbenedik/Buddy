import { useState } from "react";

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
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className={`${styles.navbar} ${searchOpen ? styles.searchOpen : ""}`}
    >
      <div className={styles.left}>
        <span className={styles.logo}>BUDDY</span>
        <div className={styles.toggleWrap}>
          <MediaToggle value={media} onChange={onMediaChange} />
        </div>
      </div>
      <Search
        media={media}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={onSelect}
      />
    </header>
  );
}

export default Navbar;

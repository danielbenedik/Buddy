import { useState } from "react";

import Search from "../Search/Search";
import SectionToggle from "../SectionToggle/SectionToggle";

import styles from "./Navbar.module.scss";

import type { Book, MediaType, ReadingTime } from "../../types/catalog";
import type { AppSection } from "../../types/section";

interface NavbarProps {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
  onSelect: (book: Book, minutes: ReadingTime) => void;
}

function Navbar({ section, onSectionChange, onSelect }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className={`${styles.navbar} ${searchOpen ? styles.searchOpen : ""}`}
    >
      <div className={styles.left}>
        <span className={styles.logo}>BUDDY</span>
        <div className={styles.toggleWrap}>
          <SectionToggle value={section} onChange={onSectionChange} />
        </div>
      </div>
      {/* Search looks up catalog titles — it has nothing to search in the game. */}
      {section !== "guess" && (
        <Search
          media={section as MediaType}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={onSelect}
        />
      )}
    </header>
  );
}

export default Navbar;

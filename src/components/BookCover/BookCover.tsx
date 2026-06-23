import { useState } from "react";

import { displayTitle, textDir, textLang } from "../../utils/display";
import { placeholderColor } from "../../utils/placeholder";

import type { Book } from "../../types/catalog";

interface BookCoverProps {
  book: Book;
  imgClassName: string;
  placeholderClassName: string;
}

function BookCover({
  book,
  imgClassName,
  placeholderClassName,
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (book.coverUrl && !failed) {
    return (
      <img
        className={imgClassName}
        src={book.coverUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={placeholderClassName}
      style={{ background: placeholderColor(book.id) }}
      dir={textDir(book)}
      lang={textLang(book)}
    >
      {displayTitle(book)}
    </span>
  );
}

export default BookCover;

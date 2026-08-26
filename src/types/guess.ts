export interface GuessOption {
  en: string;
  he: string;
}

export interface GuessSubject {
  id: string;
  wikiTitle: string;
  answer: GuessOption;
  decoys: GuessOption[];
  category: string;
}

// Gemini boxes are [ymin, xmin, ymax, xmax], normalized 0-1000.
export type Box = [number, number, number, number];

export interface SubjectBoxes {
  subject: Box | null;
  details: Box[];
}

export interface GuessRound {
  subject: GuessSubject;
  imageUrl: string;
  // The photo's true width/height ratio. The board matches it so the model's
  // bounding boxes line up with what's on screen instead of a cropped version.
  aspect: number;
  // Row-major tile costs, GUESS_ROWS * GUESS_COLS entries.
  costs: number[];
  boardTotal: number;
  options: GuessOption[];
}

// "won" clears the current picture; "finished" clears the whole run; "lost"
// ends it early, which scores nothing.
export type GuessStatus = "playing" | "won" | "lost" | "finished";

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
  // Row-major tile costs, GUESS_ROWS * GUESS_COLS entries.
  costs: number[];
  boardTotal: number;
  options: GuessOption[];
}

export type GuessStatus = "playing" | "won" | "lost";

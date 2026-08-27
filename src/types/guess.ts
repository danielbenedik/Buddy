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
  // Board side length; grows over the run (see GUESS_GRID_SIZES).
  gridSize: number;
  // Row-major tile costs, gridSize * gridSize entries.
  costs: number[];
  boardTotal: number;
  options: GuessOption[];
}

// "won"/"lost" settle the current picture (a miss costs a penalty but the run
// goes on); "finished" closes the whole run after the last picture.
export type GuessStatus = "playing" | "won" | "lost" | "finished";

export interface RunRecord {
  // Lowest total tile cost that has cleared a full run.
  score: number;
  achievedAt: number;
}

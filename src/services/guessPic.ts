import { GoogleGenAI, Type } from "@google/genai";

import { getCached, setCached } from "../utils/cache";
import {
  BOX_BATCH_SIZE,
  cacheKeys,
  GUESS_BOARD_TTL,
  GUESS_POOL_SIZE,
  guessBoxesBatchPrompt,
  guessPoolPrompt,
  MAX_BOARD_ASPECT,
  MIN_BOARD_ASPECT,
  MODEL_ID,
} from "../utils/constants";
import {
  boardTotal,
  costsFromImportance,
  importanceFromBoxes,
  isDegenerate,
} from "../utils/guessCost";
import { loadImage } from "../utils/image";

import { importanceFromPixels } from "./saliency";
import { fetchWikiImage } from "./wikiImage";

import type {
  Box,
  GuessOption,
  GuessRound,
  GuessSubject,
  SubjectBoxes,
} from "../types/guess";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
const proxyUrl = process.env.REACT_APP_GEMINI_PROXY_URL;

const ai = new GoogleGenAI(
  proxyUrl
    ? { apiKey: "proxy", httpOptions: { baseUrl: proxyUrl } }
    : { apiKey: apiKey ?? "" },
);

const isConfigured = Boolean(proxyUrl || apiKey);

function assertConfigured(): void {
  if (!isConfigured) {
    throw new Error(
      "Missing REACT_APP_GEMINI_API_KEY or REACT_APP_GEMINI_PROXY_URL",
    );
  }
}

const optionSchema = {
  type: Type.OBJECT,
  properties: {
    en: { type: Type.STRING },
    he: { type: Type.STRING },
  },
  required: ["en", "he"],
};

const poolSchema = {
  type: Type.OBJECT,
  properties: {
    subjects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          wikiTitle: { type: Type.STRING },
          en: { type: Type.STRING },
          he: { type: Type.STRING },
          category: { type: Type.STRING },
          decoys: { type: Type.ARRAY, items: optionSchema },
        },
        required: ["wikiTitle", "en", "he", "category", "decoys"],
      },
    },
  },
  required: ["subjects"],
};

const boxSchema = { type: Type.ARRAY, items: { type: Type.INTEGER } };

const boxesBatchSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          subject: boxSchema,
          details: { type: Type.ARRAY, items: boxSchema },
        },
        required: ["index", "subject", "details"],
      },
    },
  },
  required: ["results"],
};

interface RawSubject {
  wikiTitle: string;
  en: string;
  he: string;
  category: string;
  decoys: GuessOption[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toSubject(raw: RawSubject): GuessSubject {
  return {
    id: slugify(raw.wikiTitle),
    wikiTitle: raw.wikiTitle,
    answer: { en: raw.en, he: raw.he },
    decoys: (raw.decoys ?? [])
      .filter((d) => d?.en && d.en !== raw.en)
      .slice(0, 3),
    category: raw.category,
  };
}

export function hasApiKey(): boolean {
  return isConfigured;
}

// Deliberately uncached: every run should bring a fresh, random set of
// subjects instead of replaying the day's pool. The boards themselves stay
// cached, so a subject that does repeat across runs is still priced once.
export async function getSubjectPool(): Promise<GuessSubject[]> {
  assertConfigured();

  const seed = Math.random().toString(36).slice(2, 10);
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: guessPoolPrompt(seed),
    config: {
      responseMimeType: "application/json",
      responseSchema: poolSchema,
      temperature: 1.3,
    },
  });

  const raw = JSON.parse(response.text ?? '{"subjects":[]}') as {
    subjects: RawSubject[];
  };
  const subjects = (raw.subjects ?? [])
    .slice(0, GUESS_POOL_SIZE)
    .map(toSubject)
    .filter((s) => s.wikiTitle && s.decoys.length === 3);

  if (!subjects.length) throw new Error("No game subjects returned");
  return subjects;
}

const VISION_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function toInlineImage(
  url: string,
): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("image fetch failed");

  const blob = await res.blob();
  const mimeType = blob.type.split(";")[0];
  // A failed thumbnail request answers with an HTML error page, which the
  // model rejects with a 400 — bail here so the caller can fall back instead.
  if (!VISION_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType || "unknown"}`);
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return { mimeType, data: btoa(binary) };
}

function asBox(b?: number[]): Box | null {
  return b && b.length === 4 ? [b[0], b[1], b[2], b[3]] : null;
}

function toSubjectBoxes(raw: {
  subject?: number[];
  details?: number[][];
}): SubjectBoxes {
  return {
    subject: asBox(raw.subject),
    details: (raw.details ?? []).map(asBox).filter(Boolean) as Box[],
  };
}

// Boxes for several photos in one request. Results are matched back by the
// model's own 1-based index, so a dropped or reordered entry leaves that slot
// null rather than pairing one picture's boxes with another's.
async function fetchBoxesBatch(
  items: Array<{ imageUrl: string; subjectEn: string }>,
): Promise<Array<SubjectBoxes | null>> {
  const images = await Promise.all(
    items.map((item) => toInlineImage(item.imageUrl)),
  );

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: "user",
        parts: [
          ...images.map((inlineData) => ({ inlineData })),
          { text: guessBoxesBatchPrompt(items.map((i) => i.subjectEn)) },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: boxesBatchSchema,
    },
  });

  const raw = JSON.parse(response.text ?? '{"results":[]}') as {
    results?: Array<{
      index?: number;
      subject?: number[];
      details?: number[][];
    }>;
  };

  const out: Array<SubjectBoxes | null> = items.map(() => null);
  (raw.results ?? []).forEach((entry) => {
    const slot = (entry.index ?? 0) - 1;
    if (slot >= 0 && slot < out.length && !out[slot]) {
      out[slot] = toSubjectBoxes(entry);
    }
  });
  return out;
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The boxes are grid-agnostic, so one cached entry serves every grid size the
// subject may land on across runs.
interface CachedBoard {
  imageUrl: string;
  aspect: number;
  boxes: SubjectBoxes | null;
}

interface ResolvedImage {
  subject: GuessSubject;
  imageUrl: string;
  aspect: number;
}

function readBoard(subject: GuessSubject): CachedBoard | null {
  return getCached<CachedBoard>(cacheKeys.guessBoard(subject.id));
}

function writeBoard(subject: GuessSubject, board: CachedBoard): void {
  setCached(cacheKeys.guessBoard(subject.id), board, GUESS_BOARD_TTL);
}

function toRound(
  subject: GuessSubject,
  board: CachedBoard,
  gridSize: number,
  costs: number[],
): GuessRound {
  return {
    subject,
    imageUrl: board.imageUrl,
    aspect: board.aspect,
    gridSize,
    costs,
    boardTotal: boardTotal(costs),
    options: shuffle([subject.answer, ...subject.decoys]),
  };
}

// A URL is not a picture: Wikimedia answers 429/404 with an HTML page, which
// renders as a black board. Decoding here is what lets a bad subject be skipped.
async function resolveImage(subject: GuessSubject): Promise<ResolvedImage> {
  const imageUrl = await fetchWikiImage(subject.wikiTitle);
  if (!imageUrl) throw new Error(`No image for ${subject.wikiTitle}`);

  const image = await loadImage(imageUrl);
  const aspect = image.naturalWidth / image.naturalHeight;
  if (aspect < MIN_BOARD_ASPECT || aspect > MAX_BOARD_ASPECT) {
    throw new Error(`Unusable aspect ratio for ${subject.wikiTitle}`);
  }
  return { subject, imageUrl, aspect };
}

function costsFromBoxes(
  boxes: SubjectBoxes | null,
  gridSize: number,
): number[] | null {
  if (!boxes) return null;
  if (isDegenerate(boxes.subject) && !boxes.details.length) return null;
  return costsFromImportance(importanceFromBoxes(boxes, gridSize));
}

// Boxes -> pixel heuristic -> flat board, priced for this round's grid. The
// pixel fallback is local canvas work, cheap enough to redo per grid size.
async function costsFor(
  board: CachedBoard,
  gridSize: number,
): Promise<number[]> {
  const fromBoxes = costsFromBoxes(board.boxes, gridSize);
  if (fromBoxes) return fromBoxes;

  try {
    return costsFromImportance(
      await importanceFromPixels(board.imageUrl, gridSize),
    );
  } catch {
    // Last resort: a flat board keeps the round playable.
    return costsFromImportance(
      importanceFromBoxes({ subject: null, details: [] }, gridSize),
    );
  }
}

// One vision call boxes the whole group; each board is cached as it lands, so
// the pictures the player never reaches are still paid for only once.
async function priceGroup(group: ResolvedImage[]): Promise<void> {
  const boxes = await fetchBoxesBatch(
    group.map((g) => ({
      imageUrl: g.imageUrl,
      subjectEn: g.subject.answer.en,
    })),
  );

  group.forEach((item, i) => {
    writeBoard(item.subject, {
      imageUrl: item.imageUrl,
      aspect: item.aspect,
      boxes: boxes[i],
    });
  });
}

/**
 * Builds the round for `subject` on a `gridSize` x `gridSize` board. `upcoming`
 * are the next subjects in the run: any that still need boxing ride along in
 * the same vision call, which is what turns one request per subject into one
 * per small group.
 */
export async function buildRound(
  subject: GuessSubject,
  gridSize: number,
  upcoming: GuessSubject[] = [],
): Promise<GuessRound> {
  assertConfigured();

  const cached = readBoard(subject);
  if (cached) {
    return toRound(subject, cached, gridSize, await costsFor(cached, gridSize));
  }

  const target = await resolveImage(subject);

  // Only subjects that lack a board are worth batching, and only images that
  // actually resolve — a failed neighbour must not sink this round.
  const neighbours = await Promise.all(
    upcoming
      .filter((s) => !readBoard(s))
      .slice(0, BOX_BATCH_SIZE - 1)
      .map((s) => resolveImage(s).catch(() => null)),
  );
  const group: ResolvedImage[] = [target];
  neighbours.forEach((n) => {
    if (n) group.push(n);
  });

  try {
    await priceGroup(group);
  } catch {
    // Batch failed outright — fall through to an uncached, boxless board so one
    // bad moment isn't frozen in for 30 days.
  }

  const board = readBoard(subject) ?? {
    imageUrl: target.imageUrl,
    aspect: target.aspect,
    boxes: null,
  };
  return toRound(subject, board, gridSize, await costsFor(board, gridSize));
}

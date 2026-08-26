import { GoogleGenAI, Type } from "@google/genai";

import { getCached, setCached } from "../utils/cache";
import {
  cacheKeys,
  GUESS_BOARD_TTL,
  GUESS_POOL_SIZE,
  GUESS_POOL_TTL,
  guessBoxesPrompt,
  guessPoolPrompt,
  MODEL_ID,
} from "../utils/constants";
import {
  boardTotal,
  costsFromImportance,
  importanceFromBoxes,
  isDegenerate,
} from "../utils/guessCost";

import { importanceFromPixels } from "./saliency";
import { fetchWikiImage } from "./wikiImage";

import type {
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

const boxesSchema = {
  type: Type.OBJECT,
  properties: {
    subject: boxSchema,
    details: { type: Type.ARRAY, items: boxSchema },
  },
  required: ["subject", "details"],
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

// One Gemini call per day feeds a whole pool of rounds. `force` skips the cache
// to fetch fresh subjects when a long streak exhausts the current pool.
export async function getSubjectPool(force = false): Promise<GuessSubject[]> {
  assertConfigured();

  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const cacheKey = cacheKeys.guessPool(dateKey);
  if (!force) {
    const cached = getCached<GuessSubject[]>(cacheKey);
    if (cached?.length) return cached;
  }

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
  setCached(cacheKey, subjects, GUESS_POOL_TTL);
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

async function fetchBoxes(
  imageUrl: string,
  subjectEn: string,
): Promise<SubjectBoxes> {
  const image = await toInlineImage(imageUrl);
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: image }, { text: guessBoxesPrompt(subjectEn) }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: boxesSchema,
    },
  });

  const raw = JSON.parse(response.text ?? "{}") as {
    subject?: number[];
    details?: number[][];
  };
  const asBox = (b?: number[]) =>
    b && b.length === 4
      ? ([b[0], b[1], b[2], b[3]] as [number, number, number, number])
      : null;

  return {
    subject: asBox(raw.subject),
    details: (raw.details ?? [])
      .map(asBox)
      .filter(Boolean) as SubjectBoxes["details"],
  };
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface CachedBoard {
  imageUrl: string;
  costs: number[];
}

// Semantic boxes first; canvas edge density if the vision call is unusable;
// a flat board if even that fails, so a round is always playable.
async function computeCosts(
  imageUrl: string,
  subjectEn: string,
): Promise<number[]> {
  try {
    const boxes = await fetchBoxes(imageUrl, subjectEn);
    if (!isDegenerate(boxes.subject) || boxes.details.length) {
      return costsFromImportance(importanceFromBoxes(boxes));
    }
  } catch {
    // fall through to the pixel heuristic
  }

  try {
    return costsFromImportance(await importanceFromPixels(imageUrl));
  } catch {
    return costsFromImportance(
      importanceFromBoxes({ subject: null, details: [] }),
    );
  }
}

export async function buildRound(subject: GuessSubject): Promise<GuessRound> {
  assertConfigured();

  const cacheKey = cacheKeys.guessBoard(subject.id);
  const cached = getCached<CachedBoard>(cacheKey);

  let imageUrl = cached?.imageUrl ?? "";
  if (!imageUrl) {
    imageUrl = await fetchWikiImage(subject.wikiTitle);
    if (!imageUrl) throw new Error(`No image for ${subject.wikiTitle}`);
  }

  const costs =
    cached?.costs ?? (await computeCosts(imageUrl, subject.answer.en));
  if (!cached) setCached(cacheKey, { imageUrl, costs }, GUESS_BOARD_TTL);

  return {
    subject,
    imageUrl,
    costs,
    boardTotal: boardTotal(costs),
    options: shuffle([subject.answer, ...subject.decoys]),
  };
}

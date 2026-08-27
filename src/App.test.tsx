import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import App from "./App";

import type { Catalog } from "./types/catalog";

const fakeCatalog: Catalog = {
  media: "book",
  hero: {
    id: "dune-frank-herbert",
    media: "book",
    title: "Dune",
    author: "Frank Herbert",
    titleHe: "חולית",
    authorHe: "פרנק הרברט",
  },
  genres: [
    {
      id: "classics",
      label: "Classics",
      books: [
        {
          id: "1984-george-orwell",
          media: "book",
          title: "1984",
          author: "George Orwell",
          titleHe: "1984",
          authorHe: "ג'ורג' אורוול",
        },
      ],
    },
  ],
};

jest.mock("./hooks/useCatalog", () => ({
  useCatalog: () => ({ catalog: fakeCatalog, loading: false, error: null }),
}));

jest.mock("./services/gemini", () => ({
  getCatalog: jest.fn(),
  generateSummaryStream: jest.fn(),
  getFunFact: () => Promise.resolve(""),
  hasApiKey: () => false,
}));

jest.mock("./hooks/useGuessGame", () => ({
  useGuessGame: () => ({
    round: {
      subject: {
        id: "eiffel-tower",
        wikiTitle: "Eiffel Tower",
        answer: { en: "Eiffel Tower", he: "מגדל אייפל" },
        decoys: [
          { en: "Big Ben", he: "ביג בן" },
          { en: "Colosseum", he: "קולוסיאום" },
          { en: "Taj Mahal", he: "טאג' מהאל" },
        ],
        category: "אתרים",
      },
      imageUrl: "https://example.test/eiffel.jpg",
      aspect: 1.5,
      gridSize: 5,
      costs: new Array(25).fill(3),
      boardTotal: 75,
      options: [
        { en: "Eiffel Tower", he: "מגדל אייפל" },
        { en: "Big Ben", he: "ביג בן" },
        { en: "Colosseum", he: "קולוסיאום" },
        { en: "Taj Mahal", he: "טאג' מהאל" },
      ],
    },
    loading: false,
    error: null,
    revealed: [],
    status: "playing",
    spent: 0,
    runSpent: 0,
    runTotal: 0,
    pictureNumber: 1,
    runLength: 5,
    bestRun: null,
    isNewRecord: false,
    lastCorrect: true,
    reveal: jest.fn(),
    guess: jest.fn(),
    next: jest.fn(),
    restart: jest.fn(),
  }),
}));

test("opens on the game section", () => {
  render(<App />);
  expect(screen.getByText("BUDDY")).toBeInTheDocument();
  expect(screen.getByText("נחש את התמונה")).toBeInTheDocument();
  expect(screen.getByText("מגדל אייפל")).toBeInTheDocument();
});

test("covers the photo with one tile per grid cell", () => {
  render(<App />);
  const tiles = screen.getAllByRole("button", { name: /Reveal this area/ });
  // Matches the mocked round: a 5x5 opening board.
  expect(tiles).toHaveLength(25);
});

test("switches to the catalog", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "Books" }));
  expect(screen.getByText("Classics")).toBeInTheDocument();
});

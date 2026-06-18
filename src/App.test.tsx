import { render, screen } from "@testing-library/react";
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
  hasApiKey: () => false,
}));

test("renders the navbar and catalog content", () => {
  render(<App />);
  expect(screen.getByText("BUDDY")).toBeInTheDocument();
  expect(screen.getByText("Classics")).toBeInTheDocument();
});

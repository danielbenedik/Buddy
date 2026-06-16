import { render, screen } from "@testing-library/react";
import React from "react";

import App from "./App";

import type { Catalog } from "./types/catalog";

const fakeCatalog: Catalog = {
  media: "book",
  hero: { id: "dune-frank-herbert", title: "Dune", author: "Frank Herbert" },
  genres: [
    {
      id: "classics",
      label: "Classics",
      books: [
        { id: "1984-george-orwell", title: "1984", author: "George Orwell" },
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

import { useCallback, useEffect, useRef, useState } from "react";

import { generateGenreBooks, getCatalog } from "../services/gemini";
import { getCached, setCached } from "../utils/cache";
import { cacheKeys, CATALOG_TTL } from "../utils/constants";

import type { Catalog, MediaType } from "../types/catalog";

interface CatalogState {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
}

interface UseCatalog extends CatalogState {
  refreshGenre: (genreId: string) => Promise<void>;
}

export function useCatalog(media: MediaType): UseCatalog {
  const [state, setState] = useState<CatalogState>({
    catalog: null,
    loading: true,
    error: null,
  });

  // Keep the latest catalog readable inside refreshGenre without stale closures.
  const catalogRef = useRef<Catalog | null>(null);
  catalogRef.current = state.catalog;

  useEffect(() => {
    let cancelled = false;
    const key = cacheKeys.catalog(media);

    const cached = getCached<Catalog>(key);
    if (cached) {
      setState({ catalog: cached, loading: false, error: null });
      return;
    }

    setState({ catalog: null, loading: true, error: null });
    getCatalog(media)
      .then((catalog) => {
        if (cancelled) return;
        setCached(key, catalog, CATALOG_TTL);
        setState({ catalog, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          catalog: null,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load catalog",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [media]);

  const refreshGenre = useCallback(
    async (genreId: string) => {
      const catalog = catalogRef.current;
      if (!catalog) return;
      const genre = catalog.genres.find((g) => g.id === genreId);
      if (!genre) return;

      const avoid = genre.books.map((b) => b.title);
      const books = await generateGenreBooks(media, genre.label, avoid);

      setState((prev) => {
        if (!prev.catalog) return prev;
        const genres = prev.catalog.genres.map((g) =>
          g.id === genreId ? { ...g, books } : g,
        );
        const next = { ...prev.catalog, genres };
        setCached(cacheKeys.catalog(media), next, CATALOG_TTL);
        return { catalog: next, loading: false, error: null };
      });
    },
    [media],
  );

  return { ...state, refreshGenre };
}

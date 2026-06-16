import { useEffect, useState } from "react";

import { getCatalog } from "../services/gemini";
import { getCached, setCached } from "../utils/cache";
import { cacheKeys, CATALOG_TTL } from "../utils/constants";

import type { Catalog, MediaType } from "../types/catalog";

interface CatalogState {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
}

export function useCatalog(media: MediaType): CatalogState {
  const [state, setState] = useState<CatalogState>({
    catalog: null,
    loading: true,
    error: null,
  });

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

  return state;
}

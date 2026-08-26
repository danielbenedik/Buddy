import type { MediaType } from "./catalog";

// The game sits above the catalog media types: it's a section of its own.
export type AppSection = "guess" | MediaType;

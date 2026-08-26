const WIKI_MEDIA_LIST = "https://en.wikipedia.org/api/rest_v1/page/media-list";

interface MediaItem {
  type?: string;
  title?: string;
  srcset?: Array<{ src: string; scale?: string }>;
}

interface MediaListResponse {
  items?: MediaItem[];
}

// A page's "lead image" is often a logo, map, or diagram — the Eiffel Tower
// article leads with its logo. Restricting to JPEG keeps actual photographs,
// since Wikipedia's SVG/PNG/GIF media is overwhelmingly non-photographic.
function isPhoto(item: MediaItem): boolean {
  return (
    item.type === "image" &&
    Boolean(item.srcset?.length) &&
    /\.jpe?g$/i.test(item.title ?? "")
  );
}

// srcset runs small to large; the last entry is the highest resolution
// Wikimedia already has rendered, so it never 404s the way an invented
// "upsize this thumbnail" URL does.
function bestSource(item: MediaItem): string {
  const srcset = item.srcset ?? [];
  const src = srcset[srcset.length - 1]?.src ?? "";
  if (!src) return "";
  const absolute = src.startsWith("//") ? `https:${src}` : src;
  return absolute.replace(/\?.*$/, "");
}

export async function fetchWikiImage(wikiTitle: string): Promise<string> {
  const title = encodeURIComponent(wikiTitle.replace(/ /g, "_"));
  const res = await fetch(`${WIKI_MEDIA_LIST}/${title}`);
  if (!res.ok) return "";

  const json = (await res.json()) as MediaListResponse;
  const photo = (json.items ?? []).find(isPhoto);
  return photo ? bestSource(photo) : "";
}

const COLORS = [
  "#5a2d3a",
  "#2d4a3e",
  "#4a3d6b",
  "#6b4a2d",
  "#2d3a5a",
  "#1f3a5f",
  "#3a2d5a",
  "#2d5a4a",
  "#5a3a2d",
  "#4a2d4a",
];

export function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

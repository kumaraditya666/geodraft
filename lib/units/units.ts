/** Internally everything is mm. Display converts. */
export type DisplayUnit = "mm" | "cm" | "m";

export function mmToDisplay(mm: number, unit: DisplayUnit): number {
  if (unit === "cm") return mm / 10;
  if (unit === "m") return mm / 1000;
  return mm;
}

export function formatDim(mm: number, unit: DisplayUnit, decimals = 1): string {
  const v = mmToDisplay(mm, unit);
  const t = Math.abs(v) >= 100 ? 0 : decimals;
  return `${v.toFixed(t)} ${unit}`;
}

export function formatDia(mm: number, unit: DisplayUnit): string {
  return `⌀${formatDim(mm, unit)}`;
}

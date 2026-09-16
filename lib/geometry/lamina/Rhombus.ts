import { cyclicEdges, type LaminaShape2D, type Pt2 } from "./Lamina";

/** Rhombus from its two perpendicular diagonals (d1 along X, d2 along Y). */
export function rhombus(d1: number, d2: number): LaminaShape2D {
  const points: Pt2[] = [
    { x: d1 / 2, y: 0 },
    { x: 0, y: d2 / 2 },
    { x: -d1 / 2, y: 0 },
    { x: 0, y: -d2 / 2 },
  ];
  return { kind: "rhombus", points, edges: cyclicEdges(4), diagonals: [[0, 2], [1, 3]], dims: { d1, d2 }, notes: [] };
}

/** Parallelogram from base, side and interior angle (degrees). */
export function parallelogram(base: number, side: number, angleDeg: number): LaminaShape2D {
  const a = (angleDeg * Math.PI) / 180;
  const dx = side * Math.cos(a);
  const dy = side * Math.sin(a);
  const raw: Pt2[] = [
    { x: 0, y: 0 },
    { x: base, y: 0 },
    { x: base + dx, y: dy },
    { x: dx, y: dy },
  ];
  const cx = raw.reduce((s, p) => s + p.x, 0) / 4;
  const cy = raw.reduce((s, p) => s + p.y, 0) / 4;
  const points = raw.map((p) => ({ x: p.x - cx, y: p.y - cy }));
  return { kind: "parallelogram", points, edges: cyclicEdges(4), diagonals: [[0, 2], [1, 3]], dims: { base, side, angleDeg }, notes: [] };
}

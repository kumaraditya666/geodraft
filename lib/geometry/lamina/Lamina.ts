/** True-shape 2D lamina geometry: exact coordinates in the lamina's own plane. */

export interface Pt2 {
  x: number;
  y: number;
}

export interface LaminaShape2D {
  kind: string;
  /** boundary vertices in cyclic order */
  points: Pt2[];
  /** boundary edges as index pairs (cyclic) */
  edges: [number, number][];
  /** interior diagonals worth dimensioning/measuring (index pairs) */
  diagonals: [number, number][];
  /** true dimensions in mm, e.g. { side: 55 } */
  dims: Record<string, number>;
  notes: string[];
}

export const dist2 = (a: Pt2, b: Pt2): number => Math.hypot(b.x - a.x, b.y - a.y);

export const centroid2 = (pts: Pt2[]): Pt2 => ({
  x: pts.reduce((s, p) => s + p.x, 0) / Math.max(1, pts.length),
  y: pts.reduce((s, p) => s + p.y, 0) / Math.max(1, pts.length),
});

/** Angle of edge (points[i] -> points[j]) in degrees. */
export const edgeAngle2 = (pts: Pt2[], i: number, j: number): number =>
  (Math.atan2(pts[j].y - pts[i].y, pts[j].x - pts[i].x) * 180) / Math.PI;

/** Rotate all points about origin by degrees. */
export const spin2 = (pts: Pt2[], deg: number): Pt2[] => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
};

export const cyclicEdges = (n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number]);

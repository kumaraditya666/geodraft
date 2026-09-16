import { centroid2, cyclicEdges, type LaminaShape2D, type Pt2 } from "./Lamina";

/** Generic polygon from explicit vertices (recentered on centroid). */
export function polygon(raw: Pt2[], kind = "polygon"): LaminaShape2D {
  const c = centroid2(raw);
  const points = raw.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  return { kind, points, edges: cyclicEdges(points.length), diagonals: [], dims: {}, notes: [] };
}

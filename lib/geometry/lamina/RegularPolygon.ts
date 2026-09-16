import { cyclicEdges, type LaminaShape2D, type Pt2 } from "./Lamina";

/** Exact regular n-gon from true side length. Vertex 0 at 90° (apex up). */
export function regularPolygon(n: number, side: number, kind: string): LaminaShape2D {
  const R = side / (2 * Math.sin(Math.PI / n));
  const points: Pt2[] = Array.from({ length: n }, (_, i) => {
    const a = Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: R * Math.cos(a), y: R * Math.sin(a) };
  });
  const diagonals: [number, number][] = n % 2 === 0 ? [[0, n / 2]] : [];
  return { kind, points, edges: cyclicEdges(n), diagonals, dims: { side }, notes: [] };
}

export function pentagon(side: number): LaminaShape2D {
  return regularPolygon(5, side, "pentagon");
}

export function hexagon(side: number): LaminaShape2D {
  return regularPolygon(6, side, "hexagon");
}

import { type LaminaShape2D, type Pt2 } from "./Lamina";

const N = 48;

export function circle(diameter: number): LaminaShape2D {
  const r = diameter / 2;
  const points: Pt2[] = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  return {
    kind: "circle",
    points,
    edges: Array.from({ length: N }, (_, i) => [i, (i + 1) % N] as [number, number]),
    diagonals: [[0, N / 2]],
    dims: { diameter },
    notes: [],
  };
}

/** Semicircle: flat diametrical edge first (points 0..M along X), then the arc. */
export function semicircle(diameter: number): LaminaShape2D {
  const r = diameter / 2;
  const M = 24;
  const points: Pt2[] = [];
  for (let i = 0; i <= M; i++) points.push({ x: -r + (2 * r * i) / M, y: 0 });
  for (let i = 1; i < M; i++) {
    const a = (i / M) * Math.PI;
    points.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  const n = points.length;
  const edges: [number, number][] = [];
  for (let i = 0; i < M; i++) edges.push([i, i + 1]); // diameter, kept as one straight edge chain
  for (let i = M; i < n; i++) edges.push([i, (i + 1) % n]); // arc back to point 0
  return { kind: "semicircle", points, edges, diagonals: [], dims: { diameter }, notes: [] };
}

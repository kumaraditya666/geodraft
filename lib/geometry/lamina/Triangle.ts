import { centroid2, cyclicEdges, type LaminaShape2D, type Pt2 } from "./Lamina";

const recenter = (pts: Pt2[]): Pt2[] => {
  const c = centroid2(pts);
  return pts.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
};

export function equilateralTriangle(side: number): LaminaShape2D {
  const h = (side * Math.sqrt(3)) / 2;
  return {
    kind: "triangle-equilateral",
    points: recenter([
      { x: 0, y: (2 * h) / 3 },
      { x: -side / 2, y: -h / 3 },
      { x: side / 2, y: -h / 3 },
    ]),
    edges: cyclicEdges(3),
    diagonals: [],
    dims: { side },
    notes: [],
  };
}

export function isoscelesTriangle(base: number, equalSide: number): LaminaShape2D {
  const h = Math.sqrt(Math.max(0, equalSide * equalSide - (base / 2) * (base / 2)));
  return {
    kind: "triangle-isosceles",
    points: recenter([
      { x: 0, y: (2 * h) / 3 },
      { x: -base / 2, y: -h / 3 },
      { x: base / 2, y: -h / 3 },
    ]),
    edges: cyclicEdges(3),
    diagonals: [],
    dims: { base, equalSide },
    notes: [],
  };
}

/** Scalene from three side lengths (|AB|=c, |BC|=a, |CA|=b). A=(0,0), B=(c,0). */
export function scaleneTriangle(a: number, b: number, c: number): LaminaShape2D {
  const notes: string[] = [];
  if (a + b <= c || a + c <= b || b + c <= a) {
    notes.push(`Sides ${a}/${b}/${c} mm violate the triangle inequality — fell back to equilateral ${c} mm.`);
    return { ...equilateralTriangle(c), notes };
  }
  const cx = (c * c + b * b - a * a) / (2 * c);
  const cy = Math.sqrt(Math.max(0, b * b - cx * cx));
  return {
    kind: "triangle-scalene",
    points: recenter([
      { x: 0, y: 0 },
      { x: c, y: 0 },
      { x: cx, y: cy },
    ]),
    edges: cyclicEdges(3),
    diagonals: [],
    dims: { a, b, c },
    notes,
  };
}

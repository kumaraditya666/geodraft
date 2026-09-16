import { cyclicEdges, type LaminaShape2D, type Pt2 } from "./Lamina";

export function square(side: number): LaminaShape2D {
  const h = side / 2;
  const points: Pt2[] = [
    { x: -h, y: -h },
    { x: h, y: -h },
    { x: h, y: h },
    { x: -h, y: h },
  ];
  return { kind: "square", points, edges: cyclicEdges(4), diagonals: [[0, 2], [1, 3]], dims: { side }, notes: [] };
}

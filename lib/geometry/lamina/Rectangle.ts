import { cyclicEdges, type LaminaShape2D, type Pt2 } from "./Lamina";

export function rectangle(width: number, length: number): LaminaShape2D {
  const points: Pt2[] = [
    { x: -width / 2, y: -length / 2 },
    { x: width / 2, y: -length / 2 },
    { x: width / 2, y: length / 2 },
    { x: -width / 2, y: length / 2 },
  ];
  return { kind: "rectangle", points, edges: cyclicEdges(4), diagonals: [[0, 2], [1, 3]], dims: { width, length }, notes: [] };
}

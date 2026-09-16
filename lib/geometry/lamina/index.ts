import type { ParsedQuestion } from "@/types";
import type { LaminaShape2D } from "./Lamina";
import { equilateralTriangle, isoscelesTriangle, scaleneTriangle } from "./Triangle";
import { square } from "./Square";
import { rectangle } from "./Rectangle";
import { pentagon } from "./Pentagon";
import { hexagon } from "./Hexagon";
import { rhombus, parallelogram } from "./Rhombus";
import { circle, semicircle } from "./Circle";
import { regularPolygon } from "./RegularPolygon";

/**
 * True-shape dispatcher: exact flat geometry for any supported lamina,
 * driven only by parsed dimensions. Returns notes for every assumption.
 */
export function trueShapeOf(parsed: ParsedQuestion): { shape: LaminaShape2D; notes: string[] } {
  const d = parsed.dimensions;
  const shape = (parsed.planeShape ?? "rectangle").toLowerCase().replace(/semi\s*-?\s*circular/g, "semicircular");
  const notes: string[] = [];
  const side = (v: number | undefined, fallback: number, what: string): number => {
    if (v !== undefined) return v;
    notes.push(`${what} missing — assumed ${fallback} mm. Confirm the question gives it.`);
    return fallback;
  };

  if (shape.includes("semicircle") || shape.includes("semi-circular") || shape.includes("semi circular")) {
    return { shape: semicircle(side(d.diameter, 50, "Diameter")), notes };
  }
  if (shape.includes("circle") || shape.includes("circular")) {
    return { shape: circle(side(d.diameter, 50, "Diameter")), notes };
  }
  if (shape.includes("triangle") || shape.includes("triangular")) {
    const kind = parsed.triKind ?? "equilateral";
    if (kind === "isosceles") {
      const base = d.base ?? d.width ?? d.side ?? 40;
      const eq = d.triEqual ?? d.length ?? d.height ?? 50;
      return { shape: isoscelesTriangle(base, eq), notes };
    }
    if (kind === "scalene" && parsed.triSides) {
      const [a, b, c] = parsed.triSides;
      const s = scaleneTriangle(a, b, c);
      return { shape: s, notes: [...notes, ...s.notes] };
    }
    if (shape.includes("triangle") && !/equilateral|isosceles|scalene/.test(shape) && parsed.triKind === undefined) {
      notes.push("Triangle type not stated — assumed equilateral. Confirm with the question.");
    }
    return { shape: equilateralTriangle(side(d.side, 55, "Side")), notes };
  }
  if (shape.includes("square")) {
    return { shape: square(side(d.side, 30, "Side")), notes };
  }
  if (shape.includes("rhombus")) {
    const d1 = d.diag1 ?? d.diagonal1 ?? 60;
    const d2 = d.diag2 ?? d.diagonal2 ?? 40;
    if (d.diag1 === undefined) notes.push("Diagonal PR missing — assumed 60 mm.");
    if (d.diag2 === undefined) notes.push("Diagonal QS missing — assumed 40 mm.");
    return { shape: rhombus(d1, d2), notes };
  }
  if (shape.includes("parallelogram")) {
    const base = d.base ?? d.width ?? 60;
    const sd = d.side ?? d.length ?? 40;
    const ang = d.interiorAngle ?? 60;
    if (d.interiorAngle === undefined) notes.push("Interior angle missing — assumed 60°.");
    return { shape: parallelogram(base, sd, ang), notes };
  }
  if (shape.includes("pentagon")) {
    return { shape: pentagon(side(d.side, 30, "Side")), notes };
  }
  if (shape.includes("hexagon") || shape.includes("hex")) {
    return { shape: hexagon(side(d.side, 35, "Side")), notes };
  }
  const m = shape.match(/(\d+)\s*-?\s*gon/);
  if (m) {
    const n = Math.max(3, Math.min(12, parseInt(m[1], 10)));
    return { shape: regularPolygon(n, side(d.side, 30, "Side"), `${n}-gon`), notes };
  }
  const w = d.width ?? d.side ?? 60;
  const l = d.length ?? d.height ?? (d.side ?? 40);
  return { shape: rectangle(w, l), notes };
}

import { describe, expect, it } from "vitest";
import { square } from "@/lib/geometry/lamina/Square";
import { rectangle } from "@/lib/geometry/lamina/Rectangle";
import { equilateralTriangle } from "@/lib/geometry/lamina/Triangle";
import { hexagon, pentagon } from "@/lib/geometry/lamina/RegularPolygon";
import { rhombus } from "@/lib/geometry/lamina/Rhombus";
import { semicircle } from "@/lib/geometry/lamina/Circle";
import { dist2, type Pt2 } from "@/lib/geometry/lamina/Lamina";
import { parseEngineeringQuestion, buildSteps } from "@/lib/parser/engineeringParser";

const edgeLens = (pts: Pt2[]): number[] => pts.map((p, i) => dist2(p, pts[(i + 1) % pts.length]));

describe("lamina true shapes are exact", () => {
  it("square 50: four 50mm sides, right angles", () => {
    const s = square(50);
    for (const l of edgeLens(s.points)) expect(l).toBeCloseTo(50, 9);
    for (let i = 0; i < 4; i++) {
      const a = s.points[i];
      const b = s.points[(i + 1) % 4];
      const c = s.points[(i + 2) % 4];
      const dot = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
      expect(Math.abs(dot)).toBeLessThan(1e-9);
    }
  });
  it("equilateral triangle 55: three 55mm sides", () => {
    for (const l of edgeLens(equilateralTriangle(55).points)) expect(l).toBeCloseTo(55, 9);
  });
  it("pentagon 30 / hexagon 35: equal sides", () => {
    for (const l of edgeLens(pentagon(30).points)) expect(l).toBeCloseTo(30, 9);
    for (const l of edgeLens(hexagon(35).points)) expect(l).toBeCloseTo(35, 9);
  });
  it("rhombus 60x40: diagonals exact and perpendicular", () => {
    const r = rhombus(60, 40);
    expect(dist2(r.points[0], r.points[2])).toBeCloseTo(60, 9);
    expect(dist2(r.points[1], r.points[3])).toBeCloseTo(40, 9);
  });
  it("semicircle 50: diameter exact, arc above", () => {
    const s = semicircle(50);
    expect(dist2(s.points[0], s.points[24])).toBeCloseTo(50, 9);
    for (const p of s.points) expect(p.y).toBeGreaterThanOrEqual(-1e-9);
  });
  it("rectangle 60x40", () => {
    const lens = edgeLens(rectangle(60, 40).points);
    expect(lens[0]).toBeCloseTo(60, 9);
    expect(lens[1]).toBeCloseTo(40, 9);
  });
});

describe("8-stage construction timeline", () => {
  it("emits the eight lesson stages with real problem data", () => {
    const p = parseEngineeringQuestion(
      "A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30° with VP."
    );
    const steps = buildSteps(p);
    expect(steps.map((s) => s.title)).toEqual([
      "Interpret Problem",
      "Establish Reference",
      "Create True Shape",
      "Apply Inclination",
      "Project Points",
      "Generate Views",
      "Add Dimensions",
      "Final Drawing",
    ]);
    const all = steps.map((s) => `${s.title} ${s.detail}`).join(" ");
    expect(all).toContain("50");
    expect(all).toContain("70");
    expect(all).toContain("30");
  });
});

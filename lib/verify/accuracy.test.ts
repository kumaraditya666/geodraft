import { describe, expect, it } from "vitest";
import { parseEngineeringQuestion } from "@/lib/parser/engineeringParser";
import { buildSolid } from "@/lib/geometry/solids";
import { buildProjection, projectPoint } from "@/lib/projection/projectionEngine";
import { measuredAngles } from "@/lib/projection/angleEngine";
import { trueDims } from "@/lib/projection/dimensionEngine";
import { buildDXF } from "@/lib/projection/dxfExporter";
import { runAccuracyChecks } from "@/lib/verify/accuracy";

const CONE_Q =
  "A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30 degrees with VP. Draw its orthographic projections.";

describe("critical cone example", () => {
  const parsed = parseEngineeringQuestion(CONE_Q);
  it("parses exact parameters", () => {
    expect(parsed.solid).toBe("cone");
    expect(parsed.dimensions.diameter).toBe(50);
    expect(parsed.dimensions.height).toBe(70);
    expect(parsed.restingPlane).toBe("HP");
    expect(parsed.inclinations.VP).toBe(30);
  });

  const solid = buildSolid(parsed);
  it("builds exact 3D geometry", () => {
    expect(solid.radius).toBe(25);
    expect(solid.height).toBe(70);
    const minZ = Math.min(...solid.vertices.map((v) => v.p.z));
    expect(Math.abs(minZ)).toBeLessThan(1e-6); // touches HP
  });

  it("angle transform is correct", () => {
    const m = measuredAngles(solid.axisDir);
    expect(Math.abs(m.withVP - 30)).toBeLessThan(0.6);
  });

  it("projected points are consistent with the same model", () => {
    const apex = solid.apex!;
    const direct = projectPoint(apex, "front");
    const stored = buildProjection(solid, "front").points.find((p) => p.id === "apex")!;
    expect(Math.hypot(direct.x - stored.x, direct.y - stored.y)).toBeLessThan(1e-9);
    for (const v of ["front", "top", "side"] as const) {
      expect(buildProjection(solid, v).segments.length).toBeGreaterThan(0);
    }
  });

  it("dimensions come from source geometry", () => {
    const labels = trueDims(solid, "mm").map((d) => d.label);
    expect(labels.some((l) => l.includes("50"))).toBe(true);
    expect(labels.some((l) => l.includes("70"))).toBe(true);
  });

  it("accuracy checks all pass", () => {
    const failed = runAccuracyChecks(solid).filter((c) => !c.pass);
    expect(failed).toEqual([]);
  });

  it("DXF preserves dimensions as vector entities", () => {
    const dxf = buildDXF(solid, { method: "first", unit: "mm" });
    expect(dxf).toContain("GEOMETRY_VISIBLE");
    expect(dxf).toContain("0\nLINE\n");
    expect(dxf).toContain("%%C50");
    expect(dxf).toContain("70 mm");
    expect(dxf.endsWith("0\nEOF\n")).toBe(true);
  });
});

describe("dimension changes propagate 3D → 2D", () => {
  it("wider cone projects wider", () => {
    const a = buildSolid(parseEngineeringQuestion("A cone of base diameter 50 mm and height 70 mm rests on HP."));
    const b = buildSolid(parseEngineeringQuestion("A cone of base diameter 80 mm and height 70 mm rests on HP."));
    const wa = buildProjection(a, "front").bounds.w;
    const wb = buildProjection(b, "front").bounds.w;
    expect(wb - wa).toBeGreaterThan(20); // ~30mm wider, minus padding
  });
  it("steeper tilt changes the top view", () => {
    const a = buildSolid(parseEngineeringQuestion("A cylinder of diameter 40 mm and length 70 mm rests on HP. Its axis makes 20 degrees with VP."));
    const b = buildSolid(parseEngineeringQuestion("A cylinder of diameter 40 mm and length 70 mm rests on HP. Its axis makes 60 degrees with VP."));
    const ma = measuredAngles(a.axisDir);
    const mb = measuredAngles(b.axisDir);
    expect(Math.abs(ma.withVP - 20)).toBeLessThan(0.6);
    expect(Math.abs(mb.withVP - 60)).toBeLessThan(0.6);
  });
});

describe("other solids", () => {
  const cases: [string, string][] = [
    ["cylinder", "A cylinder of diameter 40 mm and height 60 mm rests on HP."],
    ["box", "A cube of side 40 mm rests on HP."],
    ["sphere", "A sphere of diameter 50 mm rests on HP."],
    ["prism", "A hexagonal prism of base side 30 mm and height 65 mm rests on HP."],
    ["pyramid", "A square pyramid of base side 40 mm and height 60 mm rests on HP."],
    ["frustum", "A frustum of a cone with bottom diameter 60 mm, top diameter 30 mm and height 70 mm rests on HP."],
    ["hemisphere", "A hemisphere of diameter 60 mm rests on HP."],
    ["tetrahedron", "A regular tetrahedron of side 50 mm rests on HP."],
  ];
  for (const [kind, q] of cases) {
    it(`${kind}: builds, projects all views, carries dimensions`, () => {
      const parsed = parseEngineeringQuestion(q);
      expect(parsed.solid).toBe(kind);
      const solid = buildSolid(parsed);
      for (const v of ["front", "top", "side"] as const) {
        const p = buildProjection(solid, v);
        expect(p.segments.length + p.points.length).toBeGreaterThan(0);
      }
      expect(trueDims(solid, "mm").length).toBeGreaterThan(0);
    });
  }
});

describe("square lamina on corner with diagonal to VP", () => {
  const Q =
    "A square lamina ABCD of 30 mm side, rests on its corner C in H.P. Its plane is inclined at 45 degrees to the xy line such that its diagonal DB is parallel to the H.P. and inclined at 30 degrees to the V.P. Draw its projections when its corner D is towards the V.P. and 15 mm infront of it.";
  const parsed = parseEngineeringQuestion(Q);
  it("parses lamina (not line), dotted planes, and diagonal staging", () => {
    expect(parsed.solid).toBe("plane");
    expect(parsed.planeShape).toBe("square");
    expect(parsed.dimensions.side).toBe(30);
    expect(parsed.restingPlane).toBe("HP");
    expect(parsed.inclinations.VP).toBe(30);
    expect(parsed.inclinations.HP).toBe(45);
    expect(parsed.planeMode).toBe("diagonal");
    expect(parsed.diagonalAngleVP).toBe(30);
    expect(parsed.dimensions.distVP).toBe(15);
  });
  it("builds exact corner-resting geometry", () => {
    const solid = buildSolid(parsed);
    const get = (id: string) => solid.vertices.find((v) => v.id === id)!.p;
    const A = get("corner-a");
    const B = get("corner-b");
    const C = get("corner-c");
    const D = get("corner-d");
    expect(Math.abs(C.z)).toBeLessThan(1e-9); // C rests on HP
    expect(Math.abs(B.z - D.z)).toBeLessThan(1e-9); // DB horizontal
    expect(Math.abs(D.y - 15)).toBeLessThan(1e-9); // D 15mm in front of VP
    expect(Math.hypot(D.x - B.x, D.y - B.y)).toBeCloseTo(30 * Math.SQRT2, 6); // true diagonal
    expect(A.z).toBeGreaterThan(D.z); // A raised
    for (const v of ["front", "top", "side"] as const) {
      expect(buildProjection(solid, v).segments.length).toBeGreaterThan(0);
    }
  });
});

describe("no-guess error handling", () => {
  it("bare angle asks HP-or-VP instead of guessing", () => {
    const p = parseEngineeringQuestion("A cone of diameter 50 mm and height 70 mm is inclined 30 degrees.");
    expect(p.inclinations.HP).toBeUndefined();
    expect(p.inclinations.VP).toBeUndefined();
    expect(p.unclear.some((u) => u.includes("with HP or VP"))).toBe(true);
  });
  it("missing diameter is flagged", () => {
    const p = parseEngineeringQuestion("A cone of height 70 mm rests on HP.");
    expect(p.unclear.some((u) => u.toLowerCase().includes("diameter"))).toBe(true);
  });
});

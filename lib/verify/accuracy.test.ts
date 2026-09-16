import { describe, expect, it } from "vitest";
import { parseEngineeringQuestion } from "@/lib/parser/engineeringParser";
import { buildSolid } from "@/lib/geometry/solids";
import { buildProjection, projectPoint } from "@/lib/projection/projectionEngine";
import { measuredAngles } from "@/lib/projection/angleEngine";
import { trueDims } from "@/lib/projection/dimensionEngine";
import { buildDXF } from "@/lib/projection/dxfExporter";
import { computeTraces } from "@/lib/projection/tracesEngine";
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

const seg3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

describe("sheet test 1: triangle with VT 25 above XY, side 45 to VP", () => {
  const Q = "An equilateral triangle of side 55 mm has its VT parallel to and 25 mm above XY. It has no HT. Draw its projections when one of its sides is inclined at 45 degrees to the VP.";
  it("parses shape, VT data and side angle", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.solid).toBe("plane");
    expect(p.dimensions.side).toBe(55);
    expect(p.vtHeightMM).toBe(25);
    expect(p.noHT).toBe(true);
    expect(p.inclinations.VP).toBe(45);
  });
  it("builds exact flat triangle floating at VT height", () => {
    const s = buildSolid(parseEngineeringQuestion(Q));
    const v = s.vertices.filter((x) => x.id.startsWith("v-")).map((x) => x.p);
    expect(v.length).toBe(3);
    expect(seg3(v[0], v[1])).toBeCloseTo(55, 6);
    expect(seg3(v[1], v[2])).toBeCloseTo(55, 6);
    expect(seg3(v[2], v[0])).toBeCloseTo(55, 6);
    for (const p of v) expect(p.z).toBeCloseTo(25, 6); // horizontal plane at VT height
    const tr = computeTraces(s.axisDir, s.baseCenter);
    expect(tr.ht).toBeNull(); // no HT: parallel to HP
    expect(tr.vt).not.toBeNull();
    expect(tr.vt!.p.z).toBeCloseTo(25, 6);
  });
});

describe("sheet test 2: square corner on HP, sides parallel VP", () => {
  const Q = "A square EFGH of side 50 mm has a corner on the HP and 30 mm in front of the VP. All the sides of the square are equally inclined to the HP and parallel to the VP. Draw its projections and show its traces.";
  it("parses vertical diamond construction", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.solid).toBe("plane");
    expect(p.planeMode).toBe("vertical");
    expect(p.diamond45).toBe(true);
    expect(p.dimensions.distVP).toBe(30);
    expect(p.relations?.VP).toBe("parallel");
  });
  it("front shows true 50mm square, plane 30mm off VP, HT but no VT", () => {
    const s = buildSolid(parseEngineeringQuestion(Q));
    for (const v of s.vertices) {
      if (v.id === "center") continue;
      expect(v.p.y).toBeCloseTo(30, 6);
    }
    const f = buildProjection(s, "front");
    const c = ["corner-a", "corner-b", "corner-c", "corner-d"].map((id) => f.points.find((p) => p.id === id)!);
    for (let i = 0; i < 4; i++) {
      const a = c[i];
      const b = c[(i + 1) % 4];
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(50, 4);
    }
    const tr = computeTraces(s.axisDir, s.baseCenter);
    expect(tr.vt).toBeNull();
    expect(tr.ht).not.toBeNull();
  });
});

describe("sheet test 3: pentagon edge on ground, 40 HP, perpendicular VP", () => {
  const Q = "A regular pentagon of side 30 mm has one side on the ground. Its plane is inclined at 40 degrees to the HP and perpendicular to the VP. Draw its projections and show its traces.";
  it("builds exact pentagon perpendicular to VP with an edge on HP", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.planeMode).toBe("edge");
    expect(p.relations?.VP).toBe("perpendicular");
    const s = buildSolid(p);
    const v = s.vertices.filter((x) => x.id.startsWith("v-")).map((x) => x.p);
    expect(v.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(seg3(v[i], v[(i + 1) % 5])).toBeCloseTo(30, 6);
    }
    expect(Math.abs(s.axisDir.y)).toBeLessThan(1e-6); // normal ⊥ ŷ ⇒ plane ⊥ VP
    const grounded = s.edges.filter((e) => Math.abs(s.vertices[e.a].p.z) < 1e-6 && Math.abs(s.vertices[e.b].p.z) < 1e-6);
    expect(grounded.length).toBeGreaterThanOrEqual(1);
  });
});

describe("sheet test 4: hexagon resting side 40 VP, surface 40 HP", () => {
  const Q = "Draw the projections of a regular hexagon of side 35 mm having one of its sides in the HP and the resting side makes an angle of 40 degrees to the VP. The planar surface makes an angle of 40 degrees to the HP.";
  it("builds exact hexagon with a full edge seated on HP", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.inclinations.HP).toBe(40);
    expect(p.inclinations.VP).toBe(40);
    const s = buildSolid(p);
    const v = s.vertices.filter((x) => x.id.startsWith("v-")).map((x) => x.p);
    expect(v.length).toBe(6);
    for (let i = 0; i < 6; i++) {
      expect(seg3(v[i], v[(i + 1) % 6])).toBeCloseTo(35, 6);
    }
    const seated = s.edges.filter((e) => Math.abs(s.vertices[e.a].p.z) < 1e-6 && Math.abs(s.vertices[e.b].p.z) < 1e-6);
    expect(seated.length).toBeGreaterThanOrEqual(1);
  });
});

describe("sheet test 5: rhombus diagonals 60/40, square top view", () => {
  const Q = "PQRS is a rhombus having diagonal PR = 60 mm and QS = 40 mm and they are perpendicular to each other. The plane of the rhombus is inclined with the HP such that its top view appears to be a square. The top view of PR makes 60 degrees with the VP. Draw its projections and determine the inclination of the plane with the HP.";
  it("derives tilt 48.2 deg and keeps diagonals exact", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.planeMode).toBe("rhombus");
    expect(Math.abs((p.inclinations.HP ?? 0) - 48.2)).toBeLessThan(0.15);
    const s = buildSolid(p);
    const g = (id: string) => s.vertices.find((v) => v.id === id)!.p;
    // finishLamina order follows the flat rhombus: PR = corner-a/corner-c, QS = corner-b/corner-d
    expect(seg3(g("corner-a"), g("corner-c"))).toBeCloseTo(60, 6);
    expect(seg3(g("corner-b"), g("corner-d"))).toBeCloseTo(40, 6);
    const dot =
      (g("corner-a").x - g("corner-c").x) * (g("corner-b").x - g("corner-d").x) +
      (g("corner-a").y - g("corner-c").y) * (g("corner-b").y - g("corner-d").y) +
      (g("corner-a").z - g("corner-c").z) * (g("corner-b").z - g("corner-d").z);
    expect(Math.abs(dot)).toBeLessThan(1e-4); // diagonals stay perpendicular
    const t = buildProjection(s, "top");
    const tp = (id: string) => t.points.find((q) => q.id === id)!;
    const prTop = Math.hypot(tp("corner-a").x - tp("corner-c").x, tp("corner-a").y - tp("corner-c").y);
    const qsTop = Math.hypot(tp("corner-b").x - tp("corner-d").x, tp("corner-b").y - tp("corner-d").y);
    expect(Math.abs(prTop - qsTop)).toBeLessThan(0.6); // plan reads square
  });
});

describe("sheet test 6: semicircle diametrical edge on VP, 30 to VP", () => {
  const Q = "A semi circular lamina of diameter 50 mm rests with its diametrical edge on the VP and the planar surface makes an angle of 30 degrees to the VP. Draw its projections.";
  it("pins the 50mm diameter in VP with surface at 30 deg", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.planeMode).toBe("vpHinge");
    const s = buildSolid(p);
    const dia = s.vertices.slice(0, 25).map((v) => v.p); // diameter chain (25 pts)
    expect(seg3(dia[0], dia[dia.length - 1])).toBeCloseTo(50, 4);
    for (const q of [dia[0], dia[dia.length - 1]]) expect(Math.abs(q.y)).toBeLessThan(1e-6);
    const n = s.axisDir;
    const dihedral = (Math.acos(Math.min(1, Math.abs(n.y) / Math.hypot(n.x, n.y, n.z))) * 180) / Math.PI;
    expect(Math.abs(dihedral - 30)).toBeLessThan(0.6);
  });
});

describe("sheet test 7: hex corner in VP, surface 30 VP, front diagonal 45 XY", () => {
  const Q = "A hexagonal plate of side 40 mm is resting on a corner in VP, with its surface making an angle of 30° with VP. The front view of the diagonal passing through that corner is inclined at 45° to the XY line. Draw the projections of the hexagonal plate.";
  it("pins corner in VP, surface 30 deg off VP, front diagonal 45 deg", () => {
    const p = parseEngineeringQuestion(Q);
    expect(p.planeMode).toBe("diagonalVP");
    expect(p.frontDiagXY).toBe(45);
    const s = buildSolid(p);
    const g = (id: string) => s.vertices.find((v) => v.id === id)!.p;
    expect(Math.abs(g("corner-a").y)).toBeLessThan(1e-6); // resting corner in VP
    const n = s.axisDir;
    const dihedral = (Math.acos(Math.min(1, Math.abs(n.y) / Math.hypot(n.x, n.y, n.z))) * 180) / Math.PI;
    expect(Math.abs(dihedral - 30)).toBeLessThan(0.6);
    const A = g("corner-a");
    const O = g("corner-d");
    const frontAng = (Math.atan2(Math.abs(O.z - A.z), Math.abs(O.x - A.x)) * 180) / Math.PI;
    expect(Math.abs(frontAng - 45)).toBeLessThan(1.2);
  });
});

describe("no-guess error handling (kept)", () => {
  it("missing diameter is flagged", () => {
    const p = parseEngineeringQuestion("A cone of height 70 mm rests on HP.");
    expect(p.unclear.some((u) => u.toLowerCase().includes("diameter"))).toBe(true);
  });
});

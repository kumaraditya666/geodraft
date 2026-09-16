import type { BuiltSolid, Edge3D, Face3D, LabeledPoint3D, ParsedQuestion, Vec3 } from "@/types";
import { add, axisFromAngles, basisForAxis, bboxOf, cross, normalize, scale, sub, v } from "./vectors";

const N_SMOOTH = 36;

function faceNormal(pts: Vec3[]): Vec3 {
  if (pts.length < 3) return v(0, 0, 1);
  const a = sub(pts[1], pts[0]);
  const b = sub(pts[2], pts[0]);
  return normalize(cross(a, b));
}

function centroid(pts: Vec3[]): Vec3 {
  const s = pts.reduce((acc, p) => add(acc, p), v());
  return scale(s, 1 / Math.max(1, pts.length));
}

function shiftToRest(
  pts: Vec3[],
  restingPlane: "HP" | "VP" | null
): { pts: Vec3[]; shift: Vec3 } {
  if (!restingPlane) return { pts, shift: v() };
  const bb = bboxOf(pts);
  if (restingPlane === "HP") {
    const dz = 0 - bb.min.z;
    return { pts: pts.map((p) => v(p.x, p.y, p.z + dz)), shift: v(0, 0, dz) };
  }
  const dy = 0 - bb.min.y;
  // keep object in front of VP (y >= 0), plus small offset so it doesn't z-fight
  return { pts: pts.map((p) => v(p.x, p.y + dy + 0.01, p.z)), shift: v(0, dy, 0) };
}

function labelBase(i: number): string {
  const abc = "ABCDEFGHIJKLMN";
  return abc[i % abc.length];
}

export function buildSolid(parsed: ParsedQuestion): BuiltSolid {
  switch (parsed.solid) {
    case "cone":
      return buildCone(parsed);
    case "cylinder":
      return buildCylinder(parsed);
    case "frustum":
      return buildFrustum(parsed);
    case "hemisphere":
      return buildHemisphere(parsed);
    case "tetrahedron":
      return buildTetrahedron(parsed);
    case "prism":
      return buildPrism(parsed);
    case "pyramid":
      return buildPyramid(parsed);
    case "line":
      return buildLine(parsed);
    case "plane":
      return buildPlane(parsed);
    case "box":
      return buildBox(parsed);
    case "sphere":
      return buildSphere(parsed);
    default:
      return buildCone(parsed);
  }
}

function coneDims(parsed: ParsedQuestion): { r: number; h: number } {
  const d = parsed.dimensions;
  const diameter = d.diameter ?? (d.radius !== undefined ? d.radius * 2 : 50);
  const r = d.radius ?? diameter / 2;
  const h = d.height ?? d.length ?? 70;
  return { r, h };
}

function buildCone(parsed: ParsedQuestion): BuiltSolid {
  const { r, h } = coneDims(parsed);
  let axis = v(0, 0, 1);
  const notes: string[] = [];
  try {
    const aH = parsed.inclinations.HP;
    const aV = parsed.inclinations.VP;
    if (parsed.restingPlane === "HP" && aH === undefined && aV === undefined) {
      axis = v(0, 0, 1);
      notes.push("Base flat on HP, axis vertical (perpendicular to HP, parallel to VP).");
    } else if (parsed.restingPlane === "HP" && aH === undefined && aV !== undefined) {
      axis = axisFromAngles(0, aV);
      notes.push(`Axis parallel to HP, inclined ${aV}° to VP. Lateral generator contacts HP.`);
    } else {
      axis = axisFromAngles(aH, aV);
      notes.push(`Axis inclined ${aH ?? 0}° to HP, ${aV ?? 0}° to VP. Lowest point contacts HP.`);
    }
  } catch {
    axis = axisFromAngles(0, parsed.inclinations.VP ?? 0);
    notes.push("Given HP/VP angles are geometrically impossible together; clamped to feasible direction.");
  }

  const { e1, e2 } = basisForAxis(axis);
  // raw positions centered at origin, base center at origin
  const Cb0 = v(0, 0, 0);
  const A0 = add(Cb0, scale(axis, h));
  const ring0: Vec3[] = [];
  for (let i = 0; i < N_SMOOTH; i++) {
    const t = (i / N_SMOOTH) * Math.PI * 2;
    ring0.push(add(Cb0, add(scale(e1, Math.cos(t) * r), scale(e2, Math.sin(t) * r))));
  }
  const all0 = [Cb0, A0, ...ring0];
  const { pts: shifted, shift } = shiftToRest(all0, parsed.restingPlane);
  const Cb = shifted[0];
  const A = shifted[1];
  void shift;
  const ring = shifted.slice(2);

  const vertices: LabeledPoint3D[] = [
    { id: "apex", label: "O", p: A },
    { id: "base-center", label: "C", p: Cb },
    ...ring.map((p, i) => ({ id: `rim-${i}`, label: i < 4 ? labelBase(i) : "", p })),
  ];
  // faces: lateral fan + base disk (as single N-gon normal -axis)
  const faces: Face3D[] = [];
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    const pa = A;
    const pb = ring[i];
    const pc = ring[j];
    faces.push({
      id: `lat-${i}`,
      verts: [0 + 2 + i, 0 + 2 + j, 0],
      normal: faceNormal([pa, pb, pc]),
      center: centroid([pa, pb, pc]),
    });
  }
  faces.push({
    id: "base",
    verts: ring.map((_, i) => 2 + i),
    normal: scale(axis, -1),
    center: Cb,
  });

  const edges: Edge3D[] = [];
  // base rim: sharp, always rendered
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    edges.push({
      id: `rim-${i}`,
      a: 2 + i,
      b: 2 + j,
      faces: [N_SMOOTH], // base face index
      sharp: true,
    });
  }
  // generators: silhouette only
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    edges.push({
      id: `gen-${i}`,
      a: 0,
      b: 2 + i,
      faces: [i, (i + N_SMOOTH - 1) % N_SMOOTH],
      sharp: false,
      silhouetteOnly: true,
    });
    void j;
  }

  const bbox = bboxOf([A, Cb, ...ring]);
  return {
    kind: "cone",
    parsed,
    vertices,
    edges,
    faces,
    axisDir: axis,
    baseCenter: Cb,
    apex: A,
    radius: r,
    height: h,
    bbox,
    notes,
  };
}

function buildCylinder(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const diameter = d.diameter ?? (d.radius !== undefined ? d.radius * 2 : 50);
  const r = d.radius ?? diameter / 2;
  const h = d.height ?? d.length ?? 70;
  const notes: string[] = [];
  let axis = v(0, 0, 1);
  try {
    const aH = parsed.inclinations.HP;
    const aV = parsed.inclinations.VP;
    if (parsed.restingPlane === "HP" && aH === undefined && aV === undefined) axis = v(0, 0, 1);
    else if (parsed.restingPlane === "HP" && aH === undefined && aV !== undefined) {
      axis = axisFromAngles(0, aV);
      notes.push(`Axis parallel to HP, ${aV}° to VP.`);
    } else axis = axisFromAngles(aH, aV);
  } catch {
    axis = axisFromAngles(0, parsed.inclinations.VP ?? 0);
    notes.push("Angles clamped to feasible direction.");
  }
  const { e1, e2 } = basisForAxis(axis);
  const Cb0 = v(0, 0, 0);
  const Ct0 = add(Cb0, scale(axis, h));
  const mkRing = (c: Vec3) => {
    const arr: Vec3[] = [];
    for (let i = 0; i < N_SMOOTH; i++) {
      const t = (i / N_SMOOTH) * Math.PI * 2;
      arr.push(add(c, add(scale(e1, Math.cos(t) * r), scale(e2, Math.sin(t) * r))));
    }
    return arr;
  };
  const b0 = mkRing(Cb0);
  const t0 = mkRing(Ct0);
  const { pts: shifted } = shiftToRest([Cb0, Ct0, ...b0, ...t0], parsed.restingPlane);
  const Cb = shifted[0];
  const Ct = shifted[1];
  const b = shifted.slice(2, 2 + N_SMOOTH);
  const t = shifted.slice(2 + N_SMOOTH);

  const vertices: LabeledPoint3D[] = [
    { id: "base-center", label: "C", p: Cb },
    { id: "top-center", label: "C'", p: Ct },
    ...b.map((p, i) => ({ id: `b-${i}`, label: i < 4 ? labelBase(i) : "", p })),
    ...t.map((p, i) => ({ id: `t-${i}`, label: i < 4 ? `${labelBase(i)}'` : "", p })),
  ];
  const faces: Face3D[] = [];
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    const mid = (i + 0.5) / N_SMOOTH * Math.PI * 2;
    const n = add(scale(e1, Math.cos(mid)), scale(e2, Math.sin(mid)));
    faces.push({ id: `lat-${i}`, verts: [2 + i, 2 + j, 2 + N_SMOOTH + j, 2 + N_SMOOTH + i], normal: n, center: centroid([b[i], b[j], t[j], t[i]]) });
  }
  faces.push({ id: "base", verts: b.map((_, i) => 2 + i), normal: scale(axis, -1), center: Cb });
  faces.push({ id: "top", verts: t.map((_, i) => 2 + N_SMOOTH + i), normal: axis, center: Ct });

  const edges: Edge3D[] = [];
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    edges.push({ id: `brim-${i}`, a: 2 + i, b: 2 + j, faces: [N_SMOOTH], sharp: true });
    edges.push({ id: `trim-${i}`, a: 2 + N_SMOOTH + i, b: 2 + N_SMOOTH + j, faces: [N_SMOOTH + 1], sharp: true });
    edges.push({ id: `gen-${i}`, a: 2 + i, b: 2 + N_SMOOTH + i, faces: [i, (i + N_SMOOTH - 1) % N_SMOOTH], sharp: false, silhouetteOnly: true });
  }
  return {
    kind: "cylinder", parsed, vertices, edges, faces, axisDir: axis,
    baseCenter: Cb, topCenter: Ct, radius: r, height: h,
    bbox: bboxOf([...b, ...t, Cb, Ct]), notes,
  };
}

function prismRadius(sides: number, side?: number, diameter?: number, radius?: number): number {
  if (radius !== undefined) return radius;
  if (diameter !== undefined) return diameter / 2;
  const s = side ?? 40;
  return s / (2 * Math.sin(Math.PI / sides));
}

function buildPrism(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const sides = parsed.sides ?? 6;
  const h = d.height ?? d.length ?? 70;
  const R = prismRadius(sides, d.side ?? d.edge, d.diameter, d.radius);
  let axis = v(0, 0, 1);
  const notes: string[] = [];
  try {
    const aH = parsed.inclinations.HP;
    const aV = parsed.inclinations.VP;
    if (parsed.restingPlane === "HP" && aH === undefined && aV === undefined) axis = v(0, 0, 1);
    else if (parsed.restingPlane === "HP" && aH === undefined && aV !== undefined) axis = axisFromAngles(0, aV);
    else axis = axisFromAngles(aH, aV);
  } catch {
    axis = axisFromAngles(0, parsed.inclinations.VP ?? 0);
    notes.push("Angles clamped.");
  }
  const { e1, e2 } = basisForAxis(axis);
  const Cb0 = v(0, 0, 0);
  const Ct0 = add(Cb0, scale(axis, h));
  const off = Math.PI / sides; // flat face toward front initially
  const mk = (c: Vec3) => Array.from({ length: sides }, (_, i) => {
    const t = off + (i / sides) * Math.PI * 2;
    return add(c, add(scale(e1, Math.cos(t) * R), scale(e2, Math.sin(t) * R)));
  });
  const b0 = mk(Cb0);
  const t0 = mk(Ct0);
  const { pts: sh } = shiftToRest([Cb0, Ct0, ...b0, ...t0], parsed.restingPlane);
  const Cb = sh[0];
  const Ct = sh[1];
  const b = sh.slice(2, 2 + sides);
  const t = sh.slice(2 + sides);
  const vertices: LabeledPoint3D[] = [
    { id: "base-center", label: "C", p: Cb },
    { id: "top-center", label: "C'", p: Ct },
    ...b.map((p, i) => ({ id: `b-${i}`, label: labelBase(i), p })),
    ...t.map((p, i) => ({ id: `t-${i}`, label: `${labelBase(i)}'`, p })),
  ];
  const faces: Face3D[] = [];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push({ id: `lat-${i}`, verts: [2 + i, 2 + j, 2 + sides + j, 2 + sides + i], normal: faceNormal([b[i], b[j], t[j]]), center: centroid([b[i], b[j], t[j], t[i]]) });
  }
  faces.push({ id: "base", verts: b.map((_, i) => 2 + i), normal: scale(axis, -1), center: Cb });
  faces.push({ id: "top", verts: t.map((_, i) => 2 + sides + i), normal: axis, center: Ct });
  const edges: Edge3D[] = [];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    edges.push({ id: `b-${i}`, a: 2 + i, b: 2 + j, faces: [i, sides], sharp: true });
    edges.push({ id: `t-${i}`, a: 2 + sides + i, b: 2 + sides + j, faces: [i, sides + 1], sharp: true });
    edges.push({ id: `v-${i}`, a: 2 + i, b: 2 + sides + i, faces: [i, (i + sides - 1) % sides], sharp: true });
  }
  return {
    kind: "prism", parsed, vertices, edges, faces, axisDir: axis,
    baseCenter: Cb, topCenter: Ct, radius: R, height: h,
    bbox: bboxOf([...b, ...t]), notes,
  };
}

function buildPyramid(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const sides = parsed.sides ?? 4;
  const h = d.height ?? 70;
  const R = prismRadius(sides, d.side ?? d.edge, d.diameter, d.radius);
  let axis = v(0, 0, 1);
  const notes: string[] = [];
  try {
    axis = axisFromAngles(parsed.inclinations.HP, parsed.inclinations.VP);
    if (parsed.restingPlane === "HP" && parsed.inclinations.HP === undefined && parsed.inclinations.VP === undefined) axis = v(0, 0, 1);
    else if (parsed.restingPlane === "HP" && parsed.inclinations.HP === undefined) axis = axisFromAngles(0, parsed.inclinations.VP);
  } catch {
    axis = axisFromAngles(0, parsed.inclinations.VP ?? 0);
  }
  const { e1, e2 } = basisForAxis(axis);
  const Cb0 = v(0, 0, 0);
  const A0 = add(Cb0, scale(axis, h));
  const off = Math.PI / sides;
  const ring0 = Array.from({ length: sides }, (_, i) => {
    const t = off + (i / sides) * Math.PI * 2;
    return add(Cb0, add(scale(e1, Math.cos(t) * R), scale(e2, Math.sin(t) * R)));
  });
  const { pts: sh } = shiftToRest([Cb0, A0, ...ring0], parsed.restingPlane);
  const Cb = sh[0];
  const A = sh[1];
  const ring = sh.slice(2);
  const vertices: LabeledPoint3D[] = [
    { id: "apex", label: "O", p: A },
    { id: "base-center", label: "C", p: Cb },
    ...ring.map((p, i) => ({ id: `b-${i}`, label: labelBase(i), p })),
  ];
  const faces: Face3D[] = [];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push({ id: `lat-${i}`, verts: [0, 2 + i, 2 + j], normal: faceNormal([A, ring[i], ring[j]]), center: centroid([A, ring[i], ring[j]]) });
  }
  faces.push({ id: "base", verts: ring.map((_, i) => 2 + i), normal: scale(axis, -1), center: Cb });
  const edges: Edge3D[] = [];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    edges.push({ id: `base-${i}`, a: 2 + i, b: 2 + j, faces: [sides, i], sharp: true });
    edges.push({ id: `lat-${i}`, a: 0, b: 2 + i, faces: [i, (i + sides - 1) % sides], sharp: true });
  }
  return { kind: "pyramid", parsed, vertices, edges, faces, axisDir: axis, baseCenter: Cb, apex: A, radius: R, height: h, bbox: bboxOf([A, Cb, ...ring]), notes };
}

function buildLine(parsed: ParsedQuestion): BuiltSolid {
  const L = parsed.dimensions.length ?? parsed.dimensions.height ?? 80;
  const notes: string[] = [];
  let dir = v(1, 0, 0);
  try {
    const aH = parsed.inclinations.HP ?? 30;
    const aV = parsed.inclinations.VP;
    dir = axisFromAngles(aH, aV);
    notes.push(`Line inclined ${aH}° to HP${aV !== undefined ? ` and ${aV}° to VP` : ", parallel to VP"}.`);
  } catch {
    dir = axisFromAngles(30, 0);
    notes.push("Line angles impossible; clamped.");
  }
  // one end on HP
  const P0 = v(0, 10, 0);
  // ensure upward
  const d = v(Math.abs(dir.x), Math.abs(dir.y) || 0.15, Math.abs(dir.z));
  const Dn = normalize(d);
  const P1 = add(P0, scale(Dn, L));
  const vertices: LabeledPoint3D[] = [
    { id: "p0", label: "A", p: P0 },
    { id: "p1", label: "B", p: P1 },
  ];
  // dummy faces so projection keeps line visible from all views
  const faces: Face3D[] = [
    { id: "f", verts: [0, 1], normal: v(0, 1, 0), center: centroid([P0, P1]) },
  ];
  const edges: Edge3D[] = [{ id: "line", a: 0, b: 1, faces: [0], sharp: true }];
  return { kind: "line", parsed, vertices, edges, faces, axisDir: Dn, baseCenter: P0, apex: P1, length: L, bbox: bboxOf([P0, P1]), notes };
}

function buildPlane(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const shape = (parsed.planeShape ?? "rectangle").toLowerCase();
  const notes: string[] = [];
  const tiltHP = parsed.inclinations.HP ?? 30;
  const yawVP = parsed.inclinations.VP ?? 0;
  if (parsed.planeMode === "diagonal" && (shape.includes("square") || shape.includes("rect"))) {
    return buildDiagonalLamina(parsed, notes);
  }
  // Build flat lamina in horizontal plane, then tilt about X by tiltHP, yaw about Z by yawVP
  const mkLocal = (): Vec3[] => {
    if (shape.includes("circle") || shape.includes("circular")) {
      const r = (d.diameter ?? 50) / 2;
      return Array.from({ length: N_SMOOTH }, (_, i) => {
        const t = (i / N_SMOOTH) * Math.PI * 2;
        return v(Math.cos(t) * r, Math.sin(t) * r, 0);
      });
    }
    if (shape.includes("triangle")) {
      const s = d.side ?? 50;
      const R = s / (Math.sqrt(3));
      return [0, 1, 2].map((i) => {
        const t = Math.PI / 2 + (i / 3) * Math.PI * 2;
        return v(Math.cos(t) * R, Math.sin(t) * R, 0);
      });
    }
    if (shape.includes("pentagon")) {
      const s = d.side ?? 40;
      const R = s / (2 * Math.sin(Math.PI / 5));
      return [0, 1, 2, 3, 4].map((i) => {
        const t = Math.PI / 2 + (i / 5) * Math.PI * 2;
        return v(Math.cos(t) * R, Math.sin(t) * R, 0);
      });
    }
    if (shape.includes("hexagon") || shape.includes("hex")) {
      const s = d.side ?? 30;
      const R = s;
      return [0, 1, 2, 3, 4, 5].map((i) => {
        const t = (i / 6) * Math.PI * 2;
        return v(Math.cos(t) * R, Math.sin(t) * R, 0);
      });
    }
    const isSquare = shape.includes("square");
    const sq = d.side ?? 30;
    const w = isSquare ? sq : (d.width ?? d.side ?? 60);
    const l = isSquare ? sq : (d.length ?? d.height ?? 40);
    return [v(-w / 2, -l / 2, 0), v(w / 2, -l / 2, 0), v(w / 2, l / 2, 0), v(-w / 2, l / 2, 0)];
  };
  const tilt = (tiltHP * Math.PI) / 180;
  const yaw = (yawVP * Math.PI) / 180;
  const rotX = (p: Vec3): Vec3 => v(p.x, p.y * Math.cos(tilt) - p.z * Math.sin(tilt), p.y * Math.sin(tilt) + p.z * Math.cos(tilt));
  const rotZ = (p: Vec3): Vec3 => v(p.x * Math.cos(yaw) - p.y * Math.sin(yaw), p.x * Math.sin(yaw) + p.y * Math.cos(yaw), p.z);
  const local = mkLocal().map((p) => rotZ(rotX(p)));
  const { pts: sh } = shiftToRest(local, parsed.restingPlane ?? "HP");
  const vertices: LabeledPoint3D[] = sh.map((p, i) => ({ id: `v-${i}`, label: labelBase(i), p }));
  const n = faceNormal([sh[0], sh[1], sh[2]]);
  const faces: Face3D[] = [{ id: "lamina", verts: sh.map((_, i) => i), normal: n, center: centroid(sh) }];
  // second face opposite for double-sided visibility
  faces.push({ id: "lamina-back", verts: sh.map((_, i) => i), normal: scale(n, -1), center: centroid(sh) });
  const edges: Edge3D[] = sh.map((_, i) => ({ id: `e-${i}`, a: i, b: (i + 1) % sh.length, faces: [0, 1], sharp: true }));
  notes.push(`Lamina surface inclined ${tiltHP}° to HP${yawVP ? `, ${yawVP}° to VP` : ""}. One edge rests on HP.`);
  return { kind: "plane", parsed, vertices, edges, faces, axisDir: n, baseCenter: centroid(sh), bbox: bboxOf(sh), notes };
}

/**
 * Corner-resting lamina with a horizontal diagonal:
 * corner C touches HP, diagonal DB stays parallel to HP at `yaw` to VP,
 * surface tilted `tilt` to HP. Constructed exactly (rotation about DB):
 *   DB endpoints B/D at center height, C dipped to z=0, A raised.
 * D is placed frontal (+Y); optional distVP pins D's distance from VP.
 */
function buildDiagonalLamina(parsed: ParsedQuestion, notes: string[]): BuiltSolid {
  const d = parsed.dimensions;
  const shape = (parsed.planeShape ?? "square").toLowerCase();
  const sq = d.side ?? 30;
  const w = shape.includes("square") ? sq : (d.width ?? sq);
  const l = shape.includes("square") ? sq : (d.length ?? d.height ?? sq);
  const tilt = ((parsed.inclinations.HP ?? 45) * Math.PI) / 180;
  const yawDeg = parsed.diagonalAngleVP ?? parsed.inclinations.VP ?? 0;
  const yaw = (yawDeg * Math.PI) / 180;
  const hd = Math.hypot(w, l) / 2; // half-diagonal
  const ux = Math.cos(yaw);
  const uy = Math.sin(yaw);
  const nx = Math.sin(yaw);
  const ny = -Math.cos(yaw);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const mz = hd * st; // center height so that C lands exactly on HP
  const M = v(0, 0, mz);
  const B = v(M.x - ux * hd, M.y - uy * hd, mz);
  const D = v(M.x + ux * hd, M.y + uy * hd, mz);
  const C = v(M.x + hd * ct * nx, M.y + hd * ct * ny, mz - hd * st);
  const A = v(M.x - hd * ct * nx, M.y - hd * ct * ny, mz + hd * st);
  let corners = [A, B, C, D];
  // pin corner D at the specified distance in front of VP
  if (d.distVP !== undefined) {
    const dy = d.distVP - D.y;
    corners = corners.map((p) => v(p.x, p.y + dy, p.z));
    notes.push(`Corner D placed ${d.distVP} mm in front of VP.`);
  }
  const [fA, fB, fC, fD] = corners;
  const n = faceNormal([fA, fB, fC]);
  const ctr = centroid(corners);
  const vertices: LabeledPoint3D[] = [
    { id: "corner-a", label: "A", p: fA },
    { id: "corner-b", label: "B", p: fB },
    { id: "corner-c", label: "C", p: fC },
    { id: "corner-d", label: "D", p: fD },
    { id: "center", label: "", p: ctr },
  ];
  const faces: Face3D[] = [
    { id: "lamina", verts: [0, 1, 2, 3], normal: n, center: ctr },
    { id: "lamina-back", verts: [0, 1, 2, 3], normal: scale(n, -1), center: ctr },
  ];
  const edges: Edge3D[] = [0, 1, 2, 3].map((i) => ({
    id: `e-${i}`,
    a: i,
    b: (i + 1) % 4,
    faces: [0, 1],
    sharp: true,
  }));
  const tiltDeg = Math.round((parsed.inclinations.HP ?? 45) * 10) / 10;
  notes.push(
    `Square ${w}×${l} mm on corner C (z=0). Diagonal DB horizontal at ${yawDeg}° to VP; surface tilted ${tiltDeg}° to HP. DB midpoint height ${Math.round(mz * 10) / 10} mm.`
  );
  const minY = Math.min(...corners.map((p) => p.y));
  if (minY < -1e-9) notes.push(`Nearest corner sits ${Math.round(Math.abs(minY) * 10) / 10} mm behind VP — only D's offset was specified.`);
  return { kind: "plane", parsed, vertices, edges, faces, axisDir: n, baseCenter: ctr, bbox: bboxOf([...corners, ctr]), notes };
}

function buildBox(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const side = d.side ?? d.edge;
  const w = d.width ?? side ?? 60;
  const dep = d.depth ?? side ?? 40;
  const h = d.height ?? d.length ?? side ?? 50;
  const c = v(0, 20, h / 2);
  const x = w / 2, y = dep / 2, z = h / 2;
  const corners = [
    v(c.x - x, c.y - y, c.z - z), v(c.x + x, c.y - y, c.z - z), v(c.x + x, c.y + y, c.z - z), v(c.x - x, c.y + y, c.z - z),
    v(c.x - x, c.y - y, c.z + z), v(c.x + x, c.y - y, c.z + z), v(c.x + x, c.y + y, c.z + z), v(c.x - x, c.y + y, c.z + z),
  ];
  const vertices = corners.map((p, i) => ({ id: `v${i}`, label: labelBase(i), p }));
  const quad = (id: string, idx: number[], pts: Vec3[]): Face3D => ({ id, verts: idx, normal: faceNormal(idx.map((k) => pts[k])), center: centroid(idx.map((k) => pts[k])) });
  const faces = [
    quad("b", [0, 1, 2, 3], corners), quad("t", [4, 5, 6, 7], corners),
    quad("f", [0, 1, 5, 4], corners), quad("bk", [3, 2, 6, 7], corners),
    quad("l", [0, 3, 7, 4], corners), quad("r", [1, 2, 6, 5], corners),
  ];
  const ePairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const edges: Edge3D[] = ePairs.map(([a, b], i) => ({ id: `e${i}`, a, b, faces: faces.map((f, fi) => (f.verts.includes(a) && f.verts.includes(b) ? fi : -1)).filter((k) => k >= 0), sharp: true }));
  return { kind: "box", parsed, vertices, edges, faces, axisDir: v(0, 0, 1), baseCenter: c, bbox: bboxOf(corners), notes: [] };
}

function buildSphere(parsed: ParsedQuestion): BuiltSolid {
  const r = (parsed.dimensions.diameter ?? parsed.dimensions.radius !== undefined ? (parsed.dimensions.radius as number) * 2 : 50) / 2;
  const c = v(0, r + 0.01, r);
  const vertices: LabeledPoint3D[] = [{ id: "c", label: "C", p: c }];
  const faces: Face3D[] = [{ id: "s", verts: [0], normal: v(0, 1, 0), center: c }];
  const edges: Edge3D[] = [];
  return { kind: "sphere", parsed, vertices, edges, faces, axisDir: v(0, 0, 1), baseCenter: c, radius: r, bbox: bboxOf([v(c.x - r, c.y - r, c.z - r), v(c.x + r, c.y + r, c.z + r)]), notes: [] };
}

function resolveAxis(parsed: ParsedQuestion, notes: string[]): Vec3 {
  const aH = parsed.inclinations.HP;
  const aV = parsed.inclinations.VP;
  try {
    if (parsed.restingPlane === "HP" && aH === undefined && aV === undefined) {
      notes.push("Base flat on HP, axis vertical (perpendicular to HP, parallel to VP).");
      return v(0, 0, 1);
    }
    if (parsed.restingPlane === "HP" && aH === undefined && aV !== undefined) {
      notes.push(`Axis parallel to HP, inclined ${aV}° to VP. Lowest generator contacts HP.`);
      return axisFromAngles(0, aV);
    }
    notes.push(`Axis inclined ${aH ?? 0}° to HP, ${aV ?? 0}° to VP. Lowest point contacts resting plane.`);
    return axisFromAngles(aH, aV);
  } catch {
    notes.push("Given HP/VP angles are geometrically impossible together; clamped to feasible direction.");
    return axisFromAngles(0, aV ?? 0);
  }
}

/** Frustum of a right circular cone: bottom radius rb, top radius rt, height h along axis. */
function buildFrustum(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const rb = (d.diameter ?? (d.radius !== undefined ? d.radius * 2 : 60)) / 2;
  const rt = (d.topDiameter ?? (d.topRadius !== undefined ? d.topRadius * 2 : rb)) / 2;
  const h = d.height ?? d.length ?? 60;
  const notes: string[] = [];
  const axis = resolveAxis(parsed, notes);
  const { e1, e2 } = basisForAxis(axis);
  const Cb0 = v(0, 0, 0);
  const Ct0 = add(Cb0, scale(axis, h));
  const ring = (c: Vec3, r: number): Vec3[] =>
    Array.from({ length: N_SMOOTH }, (_, i) => {
      const a = (i / N_SMOOTH) * Math.PI * 2;
      return add(c, add(scale(e1, Math.cos(a) * r), scale(e2, Math.sin(a) * r)));
    });
  const b0 = ring(Cb0, rb);
  const t0 = ring(Ct0, rt);
  const { pts: sh } = shiftToRest([Cb0, Ct0, ...b0, ...t0], parsed.restingPlane);
  const Cb = sh[0];
  const Ct = sh[1];
  const b = sh.slice(2, 2 + N_SMOOTH);
  const t = sh.slice(2 + N_SMOOTH);
  const vertices: LabeledPoint3D[] = [
    { id: "base-center", label: "C", p: Cb },
    { id: "top-center", label: "C'", p: Ct },
    ...b.map((p, i) => ({ id: `b-${i}`, label: i < 4 ? labelBase(i) : "", p })),
    ...t.map((p, i) => ({ id: `t-${i}`, label: i < 4 ? `${labelBase(i)}'` : "", p })),
  ];
  const faces: Face3D[] = [];
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    faces.push({
      id: `lat-${i}`,
      verts: [2 + i, 2 + j, 2 + N_SMOOTH + j, 2 + N_SMOOTH + i],
      normal: faceNormal([b[i], b[j], t[j]]),
      center: centroid([b[i], b[j], t[j], t[i]]),
    });
  }
  faces.push({ id: "base", verts: b.map((_, i) => 2 + i), normal: scale(axis, -1), center: Cb });
  faces.push({ id: "top", verts: t.map((_, i) => 2 + N_SMOOTH + i), normal: axis, center: Ct });
  const edges: Edge3D[] = [];
  for (let i = 0; i < N_SMOOTH; i++) {
    const j = (i + 1) % N_SMOOTH;
    edges.push({ id: `brim-${i}`, a: 2 + i, b: 2 + j, faces: [N_SMOOTH], sharp: true });
    edges.push({ id: `trim-${i}`, a: 2 + N_SMOOTH + i, b: 2 + N_SMOOTH + j, faces: [N_SMOOTH + 1], sharp: true });
    edges.push({ id: `gen-${i}`, a: 2 + i, b: 2 + N_SMOOTH + i, faces: [i, (i + N_SMOOTH - 1) % N_SMOOTH], sharp: false, silhouetteOnly: true });
  }
  notes.push(`Frustum: base ⌀${rb * 2} mm, top ⌀${rt * 2} mm, height ${h} mm.`);
  return {
    kind: "frustum", parsed, vertices, edges, faces, axisDir: axis,
    baseCenter: Cb, topCenter: Ct, radius: rb, height: h,
    bbox: bboxOf([...b, ...t, Cb, Ct]), notes,
  };
}

/** Hemisphere: flat circular face at baseCenter, dome extends along axis. */
function buildHemisphere(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const r = d.radius ?? (d.diameter ?? 50) / 2;
  const notes: string[] = [];
  const axis = resolveAxis(parsed, notes);
  const { e1, e2 } = basisForAxis(axis);
  const Cb0 = v(0, 0, 0);
  const N = 24;
  const K = 8;
  const ringAt = (elev: number): Vec3[] => {
    const rr = r * Math.cos(elev);
    const hh = r * Math.sin(elev);
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2;
      return add(add(Cb0, scale(axis, hh)), add(scale(e1, Math.cos(a) * rr), scale(e2, Math.sin(a) * rr)));
    });
  };
  const rings: Vec3[][] = [ringAt(0)];
  for (let k = 1; k <= K; k++) rings.push(ringAt((k / K) * (Math.PI / 2)));
  const pole = add(Cb0, scale(axis, r));
  const flat: Vec3[] = [Cb0, pole, ...rings.flat()];
  const { pts: sh } = shiftToRest(flat, parsed.restingPlane);
  const Cb = sh[0];
  const P = sh[1];
  const R: Vec3[][] = [];
  for (let k = 0; k <= K; k++) R.push(sh.slice(2 + k * N, 2 + (k + 1) * N));
  const idx = (k: number, i: number) => 2 + k * N + ((i % N + N) % N);
  const vertices: LabeledPoint3D[] = [
    { id: "base-center", label: "C", p: Cb },
    { id: "apex", label: "O", p: P },
    ...R[0].map((p, i) => ({ id: `rim-${i}`, label: i < 4 ? labelBase(i) : "", p })),
  ];
  const faces: Face3D[] = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    faces.push({ id: `q0-${i}`, verts: [idx(0, i), idx(0, j), idx(1, j), idx(1, i)], normal: faceNormal([R[0][i], R[0][j], R[1][j]]), center: centroid([R[0][i], R[0][j], R[1][j], R[1][i]]) });
  }
  for (let k = 1; k < K; k++) {
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      faces.push({ id: `q${k}-${i}`, verts: [idx(k, i), idx(k, j), idx(k + 1, j), idx(k + 1, i)], normal: faceNormal([R[k][i], R[k][j], R[k + 1][j]]), center: centroid([R[k][i], R[k][j], R[k + 1][j], R[k + 1][i]]) });
    }
  }
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    faces.push({ id: `cap-${i}`, verts: [1, idx(K, i), idx(K, j)], normal: faceNormal([P, R[K][i], R[K][j]]), center: centroid([P, R[K][i], R[K][j]]) });
  }
  faces.push({ id: "base", verts: R[0].map((_, i) => 2 + i), normal: scale(axis, -1), center: Cb });
  const edges: Edge3D[] = [];
  const baseFaceIdx = faces.length - 1;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    edges.push({ id: `rim-${i}`, a: 2 + i, b: 2 + j, faces: [i, baseFaceIdx], sharp: true });
  }
  notes.push(`Hemisphere ⌀${r * 2} mm, flat face on ${parsed.restingPlane ?? "HP"}.`);
  return {
    kind: "hemisphere", parsed, vertices, edges, faces, axisDir: axis,
    baseCenter: Cb, apex: P, radius: r, height: r,
    bbox: bboxOf([Cb, P, ...R.flat()]), notes,
  };
}

/** Regular tetrahedron: equilateral-triangle base ⊥ axis, apex along axis. */
function buildTetrahedron(parsed: ParsedQuestion): BuiltSolid {
  const d = parsed.dimensions;
  const s = d.side ?? d.edge ?? 40;
  const hgt = s * Math.sqrt(2 / 3);
  const R = s / Math.sqrt(3);
  const notes: string[] = [];
  const axis = resolveAxis(parsed, notes);
  const { e1, e2 } = basisForAxis(axis);
  const Cb0 = v(0, 0, 0);
  const A0 = add(Cb0, scale(axis, hgt));
  const ring0 = [0, 1, 2].map((i) => {
    const a = Math.PI / 2 + (i / 3) * Math.PI * 2;
    return add(Cb0, add(scale(e1, Math.cos(a) * R), scale(e2, Math.sin(a) * R)));
  });
  const { pts: sh } = shiftToRest([Cb0, A0, ...ring0], parsed.restingPlane);
  const Cb = sh[0];
  const A = sh[1];
  const ring = sh.slice(2);
  const vertices: LabeledPoint3D[] = [
    { id: "apex", label: "O", p: A },
    { id: "base-center", label: "C", p: Cb },
    ...ring.map((p, i) => ({ id: `b-${i}`, label: labelBase(i), p })),
  ];
  const faces: Face3D[] = [0, 1, 2].map((i) => {
    const j = (i + 1) % 3;
    return { id: `lat-${i}`, verts: [0, 2 + i, 2 + j], normal: faceNormal([A, ring[i], ring[j]]), center: centroid([A, ring[i], ring[j]]) };
  });
  faces.push({ id: "base", verts: [2, 3, 4], normal: scale(axis, -1), center: Cb });
  const edges: Edge3D[] = [];
  const pairs: [number, number, number[]][] = [
    [2, 3, [3, 0]], [3, 4, [3, 1]], [4, 2, [3, 2]],
    [0, 2, [0, 2]], [0, 3, [0, 1]], [0, 4, [1, 2]],
  ];
  pairs.forEach(([a, b, f], i) => edges.push({ id: `e-${i}`, a, b, faces: f, sharp: true }));
  notes.push(`Regular tetrahedron, edge ${s} mm, height ${Math.round(hgt * 10) / 10} mm.`);
  return { kind: "tetrahedron", parsed, vertices, edges, faces, axisDir: axis, baseCenter: Cb, apex: A, height: hgt, bbox: bboxOf([A, Cb, ...ring]), notes };
}

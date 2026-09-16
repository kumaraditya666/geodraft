import type { ParsedQuestion, RestingPlane, SolidKind } from "@/types";

const SOLID_PATTERNS: { kind: SolidKind; re: RegExp }[] = [
  // order matters: frustum contains "cone", hemisphere contains "sphere",
  // and "lamina/plane" must beat generic "line" (e.g. "...to the xy line")
  { kind: "frustum", re: /\bfrustum\b|\btruncated\b/i },
  { kind: "hemisphere", re: /\bhemisphere\b/i },
  { kind: "tetrahedron", re: /\btetrahedron\b|\btetrahedral\b/i },
  { kind: "cone", re: /\bcone\b/i },
  { kind: "cylinder", re: /\bcylinder\b/i },
  { kind: "prism", re: /\bprism\b/i },
  { kind: "pyramid", re: /\bpyramid\b/i },
  { kind: "box", re: /\bbox\b|\bcube\b|\bcuboid\b|\bblock\b/i },
  { kind: "plane", re: /\blamina\b|\bplate\b|\bsheet\b|\bplane\b|\btriangle\b|\btriangular\b|\bsquare\b|\brectang(?:le|ular)\b|\bpentagon(?:al)?\b|\bhexagon(?:al)?\b|\brhombus\b|\bparallelogram\b|\bsemicircle\b|\bsemi\s*circular\b|\bpolygon\b/i },
  { kind: "line", re: /\bline\b|\bline AB\b/i },
  { kind: "sphere", re: /\bsphere\b/i },
];

/** Normalize dotted surveyed abbreviations: "H.P." -> "HP", "V.P." -> "VP". */
function normalizeRefs(s: string): string {
  return s
    .replace(/\bh\s*\.\s*p\s*\./gi, "HP")
    .replace(/\bv\s*\.\s*p\s*\./gi, "VP");
}

function toMM(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === "cm") return value * 10;
  if (u === "m" && value < 10) return value * 1000;
  if (u === "m") return value * 1000;
  return value;
}

export function parseEngineeringQuestion(question: string): ParsedQuestion {
  const q = normalizeRefs(question);
  const lower = q.toLowerCase();
  const unclear: string[] = [];
  const understood: ParsedQuestion["understood"] = [];

  // solid
  let solid: SolidKind = "cone";
  let found = false;
  for (const s of SOLID_PATTERNS) {
    if (s.re.test(q)) {
      solid = s.kind;
      found = true;
      break;
    }
  }
  understood.push({ label: `Solid: ${solid}`, ok: found });
  if (!found) unclear.push("Solid type");

  // sides for prism/pyramid
  let sides: number | undefined;
  const sidesMatch = lower.match(/(triangular|square|rectangular|pentagonal|hexagonal|octagonal)/);
  const sidesMap: Record<string, number> = {
    triangular: 3, square: 4, rectangular: 4, pentagonal: 5, hexagonal: 6, octagonal: 8,
  };
  if (sidesMatch) sides = sidesMap[sidesMatch[1]];
  const nSideMatch = lower.match(/(\d+)\s*-?\s*sided?/);
  if (nSideMatch) sides = parseInt(nSideMatch[1], 10);
  if (solid === "prism" && sides === undefined) sides = 6;
  if (solid === "pyramid" && sides === undefined) sides = 4;

  // plane shape — includes sheet-problem vocabulary ("semi circular" normalized)
  let planeShape: string | undefined;
  const shapeMatch = lower
    .replace(/semi\s*-?\s*circular/g, "semicircular")
    .match(/(rectangle|rectangular|circle|circular|semicircle|semicircular|triangle|triangular|square|rhombus|parallelogram|pentagon|pentagonal|hexagon|hexagonal)\b/);
  if (shapeMatch) planeShape = shapeMatch[1];

  // dimensions
  const dimensions: Record<string, number> = {};
  let unit: ParsedQuestion["unit"] = "mm";
  const dimRe =
    /(diameter|radius|height|length|width|side|edge|base|thickness)\s*(?:of\s*)?(?:is\s*)?(?:=|:)?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?/gi;
  let m: RegExpExecArray | null;
  while ((m = dimRe.exec(q)) !== null) {
    const key = m[1].toLowerCase();
    const val = parseFloat(m[2]);
    const u = (m[3] ?? "mm").toLowerCase() as ParsedQuestion["unit"];
    if (m[3]) unit = u;
    const mm = toMM(val, m[3] ?? "mm");
    if (key === "base" && solid === "cone") {
      // "base diameter" handled by diameter pattern; skip ambiguous
      continue;
    }
    dimensions[key === "edge" ? "side" : key] = mm;
  }
  // patterns like "50 mm diameter", "50mm dia", "dia 50"
  const revRe = /(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*(diameter|dia|radius|r|height|length|width|side)\b/gi;
  while ((m = revRe.exec(q)) !== null) {
    const val = parseFloat(m[1]);
    const u = ((m[2] ?? "mm").toLowerCase()) as ParsedQuestion["unit"];
    if (m[2]) unit = u;
    let key = m[3].toLowerCase();
    if (key === "dia") key = "diameter";
    if (key === "r") key = "radius";
    dimensions[key] = toMM(val, m[2] ?? "mm");
  }
  // "base diameter 50", "base edge 40", frustum "bottom/top diameter"
  const baseRe = /base\s+(diameter|edge|side)\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/gi;
  while ((m = baseRe.exec(q)) !== null) {
    dimensions[m[1].toLowerCase()] = toMM(parseFloat(m[2]), m[3] ?? "mm");
  }
  // rhombus diagonals: "diagonal PR = 60 mm and QS = 40 mm"
  const diagM = q.match(/diagonals?\s+(?:PR\s*=\s*)?(\d+(?:\.\d+)?)\s*mm\s+and\s+(?:QS\s*=\s*)?(\d+(?:\.\d+)?)\s*mm/i);
  if (diagM && solid === "plane") {
    dimensions.diag1 = parseFloat(diagM[1]);
    dimensions.diag2 = parseFloat(diagM[2]);
    understood.push({ label: `Diagonals: ${diagM[1]} mm, ${diagM[2]} mm`, ok: true });
  }
  // triangle side sets: isosceles base/equal sides, scalene triple
  if (solid === "plane" && /isosceles/i.test(q)) {
    const tb = q.match(/base\s+(\d+(?:\.\d+)?)\s*mm/i);
    const te = q.match(/equal\s+sides?\s+(?:of\s+|are\s+)?(\d+(?:\.\d+)?)\s*mm/i);
    if (tb) dimensions.base = parseFloat(tb[1]);
    if (te) dimensions.triEqual = parseFloat(te[1]);
  }
  const tri3 = q.match(/sides?\s+(?:of\s+|are\s+)?(\d+(?:\.\d+)?)\s*(?:mm\s*)?,\s*(\d+(?:\.\d+)?)\s*(?:mm\s*)?(?:and\s+)?(\d+(?:\.\d+)?)\s*mm/i);
  let triSides: [number, number, number] | undefined;
  if (tri3 && solid === "plane") triSides = [parseFloat(tri3[1]), parseFloat(tri3[2]), parseFloat(tri3[3])];
  // parallelogram interior angle (not a plane inclination — don't ask HP/VP for it)
  let interiorAngle: number | undefined;
  if (solid === "plane" && /parallelogram/i.test(q)) {
    const im = q.match(/(?:interior\s+angle|angle\s+between)[^.?!]*?(\d+(?:\.\d+)?)\s*(?:°|degrees?)/i)
      ?? q.match(/angle\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:°|degrees?)(?![^.?!]*?(?:hp|vp))/i);
    if (im) {
      interiorAngle = parseFloat(im[1]);
      dimensions.interiorAngle = interiorAngle;
      understood.push({ label: `Interior angle: ${interiorAngle}°`, ok: true });
    }
  }
  const endRe = /(bottom|top)\s+(diameter|dia|radius)\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/gi;
  while ((m = endRe.exec(q)) !== null) {
    const which = m[1].toLowerCase();
    let key = m[2].toLowerCase();
    if (key === "dia") key = "diameter";
    const mm = toMM(parseFloat(m[3]), m[4] ?? "mm");
    if (m[4]) unit = m[4].toLowerCase() as ParsedQuestion["unit"];
    if (key === "radius") {
      if (which === "top") dimensions.topDiameter = mm * 2;
      else dimensions.diameter = mm * 2;
    } else {
      if (which === "top") dimensions.topDiameter = mm;
      else dimensions.diameter = mm;
    }
  }
  if (solid === "frustum" && dimensions.diameter !== undefined && dimensions.topDiameter === undefined && dimensions.topRadius === undefined) {
    dimensions.topDiameter = Math.round(dimensions.diameter * 0.5 * 10) / 10;
    unclear.push("Top diameter assumed 50% of base — confirm");
    understood.push({ label: `Top diameter: ${fmtDim(dimensions.topDiameter, unit)} (assumed)`, ok: false });
  }

  const dimLabels: Record<string, string> = {
    diameter: "Diameter", radius: "Radius", height: "Height", length: "Length",
    width: "Width", side: "Side", thickness: "Thickness", base: "Base",
    topDiameter: "Top diameter", distVP: "D from VP",
  };
  for (const [k, v] of Object.entries(dimensions)) {
    understood.push({ label: `${dimLabels[k] ?? k}: ${fmtDim(v, unit)}`, ok: true });
  }
  if (solid === "cone" || solid === "cylinder" || solid === "frustum") {
    if (dimensions.diameter === undefined && dimensions.radius === undefined) {
      unclear.push("Base diameter/radius");
      understood.push({ label: "Diameter: missing", ok: false });
    }
    if (dimensions.height === undefined && dimensions.length === undefined) {
      unclear.push("Height");
      understood.push({ label: "Height: missing", ok: false });
    }
  }
  if (solid === "tetrahedron" && dimensions.side === undefined && dimensions.edge === undefined) {
    unclear.push("Edge length (side)");
    understood.push({ label: "Side: missing", ok: false });
  }
  if (solid === "hemisphere" && dimensions.diameter === undefined && dimensions.radius === undefined) {
    unclear.push("Diameter/radius");
    understood.push({ label: "Diameter: missing", ok: false });
  }

  // resting plane ("ground" counts as HP; "in VP" counts as VP)
  let restingPlane: RestingPlane = null;
  if (/\brests?\s+on\s+(hp|horizontal)/i.test(q) || /\bon\s+(hp|horizontal plane)\b/i.test(q)) restingPlane = "HP";
  else if (/\brests?\s+on\s+(vp|vertical)/i.test(q)) restingPlane = "VP";
  else if (/\bin\s+(?:the\s+)?vp\b/i.test(q)) restingPlane = "VP";
  else if (/\bhp\b/i.test(q) && !/\bvp\b/i.test(q)) restingPlane = "HP";
  else if (/\bvp\b/i.test(q) && !/\bhp\b/i.test(q)) restingPlane = "VP";
  else if (/\bground\b/i.test(q)) restingPlane = "HP";
  if (solid === "line" || solid === "plane") {
    // lines/planes often float; default HP reference
    if (!restingPlane) restingPlane = "HP";
  } else if (!restingPlane) {
    restingPlane = "HP";
    unclear.push("Resting plane (assumed HP)");
  }
  understood.push({ label: `Resting plane: ${restingPlane ?? "?"}`, ok: restingPlane !== null });

  // lamina resting element: corner vs edge/side
  let restingKind: ParsedQuestion["restingKind"];
  if (solid === "plane") {
    if (/on\s+(?:its\s+|a\s+|the\s+)?corner/i.test(q)) {
      restingKind = "corner";
      understood.push({ label: "Resting element: corner", ok: true });
    } else if (/(?:edge|side)s?\s+(?:of\s+\w+\s+)?(?:rest(?:s|ing)?\s+)?(?:on|in)\s+(?:the\s+)?(?:hp|vp|ground)|on\s+(?:its\s+|a\s+|an\s+|the\s+)?(?:edge|side)s?/i.test(q)) {
      restingKind = "edge";
      understood.push({ label: "Resting element: edge/side", ok: true });
    }
  }

  // plane relations to principal planes (subject must be the surface, not a diagonal)
  const relations: ParsedQuestion["relations"] = {};
  if (solid === "plane") {
    if (/(?:plane|surface|lamina)[^.?!]*?\bperpendicular\b[^.?!]*?\bvp\b/i.test(q)) relations.VP = "perpendicular";
    else if (/(?:sides?|plane|surface|lamina)[^.?!]*?\bparallel\b[^.?!]*?\bvp\b/i.test(q)) relations.VP = "parallel";
    if (/(?:plane|surface|lamina)[^.?!]*?\bperpendicular\b[^.?!]*?\bhp\b/i.test(q)) relations.HP = "perpendicular";
    else if (/(?:sides?|plane|surface|lamina)[^.?!]*?\bparallel\b[^.?!]*?\bhp\b/i.test(q)) relations.HP = "parallel";
    if (relations.VP) understood.push({ label: `Relation to VP: ${relations.VP}`, ok: true });
    if (relations.HP) understood.push({ label: `Relation to HP: ${relations.HP}`, ok: true });
  }

  // triangle kind
  let triKind: ParsedQuestion["triKind"];
  if (solid === "plane" && /triang/i.test(q)) {
    if (/equilateral/i.test(q)) triKind = "equilateral";
    else if (/isosceles/i.test(q)) triKind = "isosceles";
    else if (/scalene/i.test(q)) triKind = "scalene";
  }

  // inclinations — allow "to the VP" / "with the HP" phrasing
  const inclinations: ParsedQuestion["inclinations"] = {};
  const angRe = /(?:axis|line|plane|surface|base|diagonal)?\s*(?:makes|make|making|inclined|incline|inclination|at)\s*(?:an?\s*)?(?:angle\s*(?:of\s*)?)?(\d+(?:\.\d+)?)\s*(?:°|deg(?:rees?)?)\s*(?:with|to|from|w\.?r\.?t\.?)(?:\s+the)?\s*(hp|vp|horizontal|vertical|xy)/gi;
  while ((m = angRe.exec(q)) !== null) {
    const val = parseFloat(m[1]);
    const plane = m[2].toLowerCase();
    if (plane.startsWith("h")) inclinations.HP = val;
    else if (plane.startsWith("v")) inclinations.VP = val;
  }
  // "30° with VP" fallback (also "30° to the VP")
  const shortRe = /(\d+(?:\.\d+)?)\s*°\s*(?:with|to)(?:\s+the)?\s*(hp|vp)/gi;
  while ((m = shortRe.exec(q)) !== null) {
    const val = parseFloat(m[1]);
    if (m[2].toLowerCase() === "hp" && inclinations.HP === undefined) inclinations.HP = val;
    if (m[2].toLowerCase() === "vp" && inclinations.VP === undefined) inclinations.VP = val;
  }
  // front-view diagonal constraint: "front view of the diagonal ... 45° to XY"
  let frontDiagXY: number | undefined;
  {
    const fm = q.match(/front[^.?!]*?diagonal[^.?!]*?(\d+(?:\.\d+)?)\s*(?:°|degrees?)[^.?!]*?xy/i);
    if (fm && solid === "plane") {
      frontDiagXY = parseFloat(fm[1]);
      understood.push({ label: `Front diagonal: ${frontDiagXY}° to XY`, ok: true });
    }
  }
  // "N° to the XY line" for a lamina (skipped when it's really a front-diagonal constraint)
  let xyAngle: number | undefined;
  const xyRe = /(\d+(?:\.\d+)?)\s*(?:°|degrees?)\s*(?:to|with|from)(?:\s+the)?\s*xy\b/gi;
  let xm: RegExpExecArray | null;
  while ((xm = xyRe.exec(q)) !== null) xyAngle = parseFloat(xm[1]);
  if (xyAngle !== undefined && solid === "plane" && inclinations.HP === undefined && frontDiagXY === undefined) {
    inclinations.HP = xyAngle;
    unclear.push(`${xyAngle}° to XY read as surface tilt to HP — confirm`);
    understood.push({ label: `Surface tilt: ${xyAngle}° to HP (from XY, confirm)`, ok: false });
  }
  // trace data: VT height above XY, missing HT
  let vtHeightMM: number | undefined;
  let noHT = false;
  if (solid === "plane") {
    const vm = q.match(/(\d+(?:\.\d+)?)\s*mm\s+above\s+xy/i);
    if (vm) {
      vtHeightMM = parseFloat(vm[1]);
      understood.push({ label: `VT ${vtHeightMM} mm above XY`, ok: true });
    }
    if (/no\s+ht/i.test(q)) {
      noHT = true;
      understood.push({ label: "HT: none (plane parallel to HP)", ok: true });
    }
    if (noHT && vtHeightMM !== undefined && inclinations.HP === undefined && inclinations.VP === undefined) {
      inclinations.HP = 0;
      understood.push({ label: "Plane horizontal (no HT, VT ∥ XY)", ok: true });
    }
  }
  // square diamond: "all sides equally inclined to HP"
  let diamond45 = false;
  if (solid === "plane" && /square/i.test(q) && /equally\s+inclined/i.test(q)) {
    diamond45 = true;
    understood.push({ label: "Square rotated 45° in its plane (diamond)", ok: true });
  }
  // rhombus appearing square in top view → derive surface tilt: cos(t) = short/long
  let rhombusSquareTop = false;
  if (solid === "plane" && /rhombus/i.test(q) && dimensions.diag1 !== undefined && dimensions.diag2 !== undefined
    && /appear(?:s|ing)?\s+(?:to\s+be\s+)?an?\s+square/i.test(q)) {
    rhombusSquareTop = true;
    const tilt = Math.round((Math.acos(Math.min(dimensions.diag1, dimensions.diag2) / Math.max(dimensions.diag1, dimensions.diag2)) * 180) / Math.PI * 10) / 10;
    inclinations.HP = tilt;
    understood.push({ label: `Surface tilt derived: ${tilt}° (top view square ⇒ cos t = ${Math.min(dimensions.diag1, dimensions.diag2)}/${Math.max(dimensions.diag1, dimensions.diag2)})`, ok: true });
  }
  // bare angle with no reference, e.g. "inclined 30 degrees" — do NOT guess, ask
  if (inclinations.HP === undefined && inclinations.VP === undefined) {
    const consumed = new Set<number>(
      [inclinations.HP, inclinations.VP, xyAngle, interiorAngle, frontDiagXY].filter((v): v is number => v !== undefined)
    );
    const loose: number[] = [];
    const degRe = /(\d+(?:\.\d+)?)\s*(?:°|degrees?)\b/gi;
    let d: RegExpExecArray | null;
    while ((d = degRe.exec(q)) !== null) {
      const ctx = q.slice(Math.max(0, d.index - 18), d.index + d[0].length + 18).toLowerCase();
      const val = parseFloat(d[1]);
      if (!/(hp|vp|horizontal|vertical|xy)/.test(ctx) && !consumed.has(val)) loose.push(val);
    }
    if (loose.length > 0 && (solid === "cone" || solid === "cylinder" || solid === "frustum" || solid === "prism" || solid === "pyramid" || solid === "line" || solid === "plane")) {
      unclear.push(`Angle ${loose[0]}° — with HP or VP?`);
      understood.push({ label: `Angle ${loose[0]}°: reference missing`, ok: false });
    }
  }
  if (inclinations.HP !== undefined) understood.push({ label: `Angle with HP: ${inclinations.HP}°`, ok: true });
  if (inclinations.VP !== undefined) understood.push({ label: `Angle with VP: ${inclinations.VP}°`, ok: true });
  // lamina construction mode from resting condition + relations
  let planeMode: ParsedQuestion["planeMode"] = "edge";
  let diagonalAngleVP: number | undefined;
  if (solid === "plane" && /diagonal/i.test(q) && restingPlane !== "VP" && !rhombusSquareTop) {
    planeMode = "diagonal";
    const dm = q.match(/diagonal[^.?!]*?(\d+(?:\.\d+)?)\s*(?:°|degrees?)[^.?!]*?vp/i);
    if (dm) {
      diagonalAngleVP = parseFloat(dm[1]);
      understood.push({ label: `Diagonal–VP angle: ${diagonalAngleVP}°`, ok: true });
    } else if (inclinations.VP !== undefined) {
      diagonalAngleVP = inclinations.VP;
      understood.push({ label: `Diagonal–VP angle: ${diagonalAngleVP}° (from axis angle)`, ok: true });
    } else {
      unclear.push("Diagonal angle with VP missing");
      understood.push({ label: "Diagonal–VP angle: missing", ok: false });
    }
    if (inclinations.HP === undefined) {
      unclear.push("Surface tilt (HP) missing");
      understood.push({ label: "Surface tilt: missing", ok: false });
    }
  }
  if (solid === "plane" && planeMode === "edge") {
    const cornerVP = restingKind === "corner" && restingPlane === "VP";
    const surfVPTilt = inclinations.VP !== undefined && inclinations.HP === undefined;
    if (cornerVP && (surfVPTilt || /diagonal/i.test(q))) {
      planeMode = "diagonalVP";
      understood.push({ label: "Construction: corner in VP, hinged off VP", ok: true });
    } else if (relations?.VP === "parallel" && inclinations.HP === undefined) {
      planeMode = "vertical";
      understood.push({ label: "Construction: true shape in VP-parallel plane", ok: true });
    } else if (/semicirc|semi\s*circ/i.test(planeShape ?? "") && restingKind === "edge" && restingPlane === "VP") {
      planeMode = "vpHinge";
      understood.push({ label: "Construction: diameter in VP, surface hinged off VP", ok: true });
    } else if (rhombusSquareTop) {
      planeMode = "rhombus";
      understood.push({ label: "Construction: tilt about short diagonal, yaw to VP angle", ok: true });
    }
  }
  // "15 mm in front of VP/it" — offset distance from VP
  const distM = q.match(/(\d+(?:\.\d+)?)\s*mm\s+in\s*front\s*of\s+(?:the\s+)?(?:vp|it|them)/i);
  if (distM && solid === "plane") {
    dimensions.distVP = parseFloat(distM[1]);
    understood.push({ label: `D corner ${dimensions.distVP} mm from VP`, ok: true });
  }
  if (inclinations.HP === undefined && inclinations.VP === undefined) {
    if (solid === "line") {
      unclear.push("Inclination angles");
    }
  }

  const total = understood.length || 1;
  const okCount = understood.filter((u) => u.ok).length;
  const confidence = Math.round((okCount / (total + unclear.length * 0.5)) * 100);

  return {
    solid, dimensions, unit, restingPlane, inclinations, sides, planeShape,
    planeMode, diagonalAngleVP, restingKind, relations,
    vtHeightMM, noHT, rhombusSquareTop, diamond45,
    triKind, triSides, frontDiagXY,
    raw: question, confidence: Math.min(98, Math.max(20, confidence)), unclear, understood,
  };
}

function fmtDim(mm: number, unit: ParsedQuestion["unit"]): string {
  if (unit === "cm") return `${trim(mm / 10)} cm`;
  if (unit === "m") return `${trim(mm / 1000)} m`;
  return `${trim(mm)} mm`;
}
function trim(n: number): string {
  return `${Math.round(n * 100) / 100}`;
}

/** Build human construction steps from parsed + solid kind */
export function buildSteps(parsed: ParsedQuestion): { title: string; detail: string; student: string }[] {
  const dimStr = Object.entries(parsed.dimensions)
    .map(([k, v]) => `${k} ${v} mm`)
    .join(", ");
  const angStr =
    parsed.inclinations.HP !== undefined || parsed.inclinations.VP !== undefined
      ? ` Inclined ${parsed.inclinations.HP !== undefined ? `${parsed.inclinations.HP}° to HP` : ""}${parsed.inclinations.HP !== undefined && parsed.inclinations.VP !== undefined ? " and " : ""}${parsed.inclinations.VP !== undefined ? `${parsed.inclinations.VP}° to VP` : ""}.`
      : "";
  const base: { title: string; detail: string; student: string }[] = [
    {
      title: "Draw the XY reference line",
      detail: "XY is the intersection of HP (z=0) and VP (y=0). Front view goes above XY, top view below (first-angle).",
      student: "Think of XY as the fold between the floor (HP) and the wall (VP). Everything above it is what you see from the front; below is what you see from above.",
    },
    {
      title: "Place the solid in 3D",
      detail: `${cap(parsed.solid)} (${dimStr}) resting on ${parsed.restingPlane}.${angStr} Lowest point touches ${parsed.restingPlane} (z=0 / y=0). Axis direction solved with direction cosines.`,
      student: `We put the ${parsed.solid} so it just touches the floor. Its long direction (axis) is tilted exactly as the question says — that tilt is what changes the drawings.`,
    },
    {
      title: "Draw the initial projection",
      detail: "Project every 3D vertex: Front=(x,z), Top=(x,−y), Side=(−y,z). Join edges; faces pointing away become dashed hidden lines.",
      student: "To draw the front view, ignore how deep each point is and keep left-right + height. For the top view, ignore height and keep left-right + depth.",
    },
    {
      title: "Apply inclination",
      detail: parsed.inclinations.VP !== undefined && parsed.inclinations.HP === undefined && parsed.restingPlane === "HP"
        ? `Axis kept parallel to HP and rotated ${parsed.inclinations.VP}° toward VP (sin αVP = |dy|). Lateral generator now contacts HP — recompute min-Z shift.`
        : "Rotate the axis with the specified HP/VP angles, then re-seat the solid so contact with the resting plane is preserved.",
      student: "Tilting the solid moves which edges you can see. Edges on the far side turn dashed — that is why hidden lines appear.",
    },
    {
      title: "Drop projector lines",
      detail: "From each vertex, draw thin projectors perpendicular to XY into the other view. Front↔Top projectors are vertical and meet at XY.",
      student: "Projectors are like sun-rays: each 3D corner casts one ray straight into the front wall and one straight down to the floor. Where rays land is where you draw the point.",
    },
    {
      title: "Complete final views + dimensions",
      detail: "Darken visible outlines, dash hidden edges, add center lines, then dimension true sizes (⌀, height, angles) from the 3D source — never hand-typed.",
      student: "Thick lines are edges you can really see. Dashed lines are hidden behind the solid. Dimensions always come from the real 3D size.",
    },
  ];
  return base;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

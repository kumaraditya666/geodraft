import type { ParsedQuestion, RestingPlane, SolidKind } from "@/types";

const SOLID_PATTERNS: { kind: SolidKind; re: RegExp }[] = [
  { kind: "cone", re: /\bcone\b/i },
  { kind: "cylinder", re: /\bcylinder\b/i },
  { kind: "prism", re: /\bprism\b/i },
  { kind: "pyramid", re: /\bpyramid\b/i },
  { kind: "line", re: /\bline\b/i },
  { kind: "plane", re: /\blamina\b|\bplane\b|\bplate\b|\bsheet\b/i },
  { kind: "box", re: /\bbox\b|\bcube\b|\bblock\b/i },
  { kind: "sphere", re: /\bsphere\b/i },
];

function toMM(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === "cm") return value * 10;
  if (u === "m" && value < 10) return value * 1000;
  if (u === "m") return value * 1000;
  return value;
}

export function parseEngineeringQuestion(question: string): ParsedQuestion {
  const q = question;
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

  // plane shape
  let planeShape: string | undefined;
  const shapeMatch = lower.match(/(rectangle|rectangular|circle|circular|triangle|triangular|square|pentagon|pentagonal|hexagon|hexagonal)\b/);
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
  // "base diameter 50", "base edge 40"
  const baseRe = /base\s+(diameter|edge|side)\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/gi;
  while ((m = baseRe.exec(q)) !== null) {
    dimensions[m[1].toLowerCase()] = toMM(parseFloat(m[2]), m[3] ?? "mm");
  }

  const dimLabels: Record<string, string> = {
    diameter: "Diameter", radius: "Radius", height: "Height", length: "Length",
    width: "Width", side: "Side", thickness: "Thickness", base: "Base",
  };
  for (const [k, v] of Object.entries(dimensions)) {
    understood.push({ label: `${dimLabels[k] ?? k}: ${fmtDim(v, unit)}`, ok: true });
  }
  if (solid === "cone" || solid === "cylinder") {
    if (dimensions.diameter === undefined && dimensions.radius === undefined) {
      unclear.push("Base diameter/radius");
      understood.push({ label: "Diameter: missing", ok: false });
    }
    if (dimensions.height === undefined && dimensions.length === undefined) {
      unclear.push("Height");
      understood.push({ label: "Height: missing", ok: false });
    }
  }

  // resting plane
  let restingPlane: RestingPlane = null;
  if (/\brests?\s+on\s+(hp|horizontal)/i.test(q) || /\bon\s+(hp|horizontal plane)\b/i.test(q)) restingPlane = "HP";
  else if (/\brests?\s+on\s+(vp|vertical)/i.test(q)) restingPlane = "VP";
  else if (/\bhp\b/i.test(q) && !/\bvp\b/i.test(q)) restingPlane = "HP";
  else if (/\bvp\b/i.test(q) && !/\bhp\b/i.test(q)) restingPlane = "VP";
  if (solid === "line" || solid === "plane") {
    // lines/planes often float; default HP reference
    if (!restingPlane) restingPlane = "HP";
  } else if (!restingPlane) {
    restingPlane = "HP";
    unclear.push("Resting plane (assumed HP)");
  }
  understood.push({ label: `Resting plane: ${restingPlane ?? "?"}`, ok: restingPlane !== null });

  // inclinations
  const inclinations: ParsedQuestion["inclinations"] = {};
  const angRe = /(?:axis|line|plane|surface|base)?\s*(?:makes|make|inclined|incline|inclination|at)\s*(?:an?\s*)?(?:angle\s*(?:of\s*)?)?(\d+(?:\.\d+)?)\s*(?:°|deg(?:rees?)?)\s*(?:with|to|from|w\.?r\.?t\.?)\s*(hp|vp|horizontal|vertical|xy)/gi;
  while ((m = angRe.exec(q)) !== null) {
    const val = parseFloat(m[1]);
    const plane = m[2].toLowerCase();
    if (plane.startsWith("h")) inclinations.HP = val;
    else if (plane.startsWith("v")) inclinations.VP = val;
  }
  // "30° with VP" fallback
  const shortRe = /(\d+(?:\.\d+)?)\s*°\s*(?:with|to)\s*(hp|vp)/gi;
  while ((m = shortRe.exec(q)) !== null) {
    const val = parseFloat(m[1]);
    if (m[2].toLowerCase() === "hp" && inclinations.HP === undefined) inclinations.HP = val;
    if (m[2].toLowerCase() === "vp" && inclinations.VP === undefined) inclinations.VP = val;
  }
  if (inclinations.HP !== undefined) understood.push({ label: `Angle with HP: ${inclinations.HP}°`, ok: true });
  if (inclinations.VP !== undefined) understood.push({ label: `Angle with VP: ${inclinations.VP}°`, ok: true });
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

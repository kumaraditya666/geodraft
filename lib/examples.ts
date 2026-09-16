import type { ParsedQuestion } from "@/types";

export interface ExampleItem {
  id: string;
  title: string;
  tag: string;
  question: string;
  preset: ParsedQuestion;
}

function p(
  id: string,
  title: string,
  tag: string,
  question: string,
  preset: Partial<ParsedQuestion> & { solid?: ParsedQuestion["solid"] }
): ExampleItem {
  return {
    id,
    title,
    tag,
    question,
    preset: {
      solid: "cone",
      dimensions: {},
      unit: "mm",
      restingPlane: "HP",
      inclinations: {},
      raw: question,
      confidence: 98,
      unclear: [],
      understood: [],
      ...preset,
    } as ParsedQuestion,
  };
}

export const EXAMPLES: ExampleItem[] = [
  p("cone-hp", "Cone resting on HP", "Cone", "A cone of base diameter 50 mm and height 70 mm rests on HP with its base on HP.", {
    dimensions: { diameter: 50, height: 70 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("cone-vp30", "Cone inclined to VP", "Cone • 30° VP", "A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30° with VP. Draw its orthographic projections.", {
    dimensions: { diameter: 50, height: 70 },
    restingPlane: "HP",
    inclinations: { VP: 30 },
  }),
  p("cyl-hp", "Cylinder resting on HP", "Cylinder", "A cylinder of base diameter 40 mm and height 60 mm rests on HP on its base.", {
    solid: "cylinder",
    dimensions: { diameter: 40, height: 60 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("cyl-vp", "Cylinder inclined to VP", "Cylinder • 35°", "A cylinder of diameter 40 mm and length 70 mm rests on HP on its side. Its axis is inclined at 35° to VP.", {
    solid: "cylinder",
    dimensions: { diameter: 40, length: 70 },
    restingPlane: "HP",
    inclinations: { VP: 35 },
  }),
  p("prism-hp", "Hex prism on HP", "Prism", "A hexagonal prism of base side 30 mm and height 65 mm rests on HP on its base with an edge parallel to VP.", {
    solid: "prism",
    sides: 6,
    dimensions: { side: 30, height: 65 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("prism-hp30", "Prism inclined to HP", "Prism • 30° HP", "A square prism of base side 35 mm and height 70 mm rests on HP on an edge. Its axis is inclined at 30° to HP and parallel to VP.", {
    solid: "prism",
    sides: 4,
    dimensions: { side: 35, height: 70 },
    restingPlane: "HP",
    inclinations: { HP: 30 },
  }),
  p("pyr-hp", "Pyramid on HP", "Pyramid", "A square pyramid of base side 40 mm and height 60 mm rests on HP on its base.", {
    solid: "pyramid",
    sides: 4,
    dimensions: { side: 40, height: 60 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("line-hp-vp", "Line inclined to HP & VP", "Line", "A line AB 80 mm long is inclined at 30° to HP and 45° to VP. End A is on HP.", {
    solid: "line",
    dimensions: { length: 80 },
    restingPlane: "HP",
    inclinations: { HP: 30, VP: 45 },
  }),
  p("plane-hp", "Plane inclined to HP", "Lamina", "A rectangular lamina 60 mm × 40 mm rests on HP on an edge. Its surface is inclined at 45° to HP.", {
    solid: "plane",
    planeShape: "rectangular",
    dimensions: { width: 60, length: 40 },
    restingPlane: "HP",
    inclinations: { HP: 45 },
  }),
  p("cone-section", "Section of cone", "Section", "A cone of base diameter 50 mm and height 70 mm rests on HP. It is cut by a plane parallel to HP at 30 mm above the base. Draw the sectional top view.", {
    solid: "cone",
    dimensions: { diameter: 50, height: 70 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("cyl-hp45", "Cylinder 45° HP", "Cylinder • 45°", "A cylinder of diameter 45 mm and height 75 mm rests on HP. Its axis is inclined at 45° to HP and parallel to VP.", {
    solid: "cylinder",
    dimensions: { diameter: 45, height: 75 },
    restingPlane: "HP",
    inclinations: { HP: 45 },
  }),
  p("pent-pyramid", "Pentagonal pyramid", "Pyramid", "A pentagonal pyramid of base side 30 mm and height 65 mm rests on HP on its base.", {
    solid: "pyramid",
    sides: 5,
    dimensions: { side: 30, height: 65 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("frustum-hp", "Frustum on HP", "Frustum", "A frustum of a cone with bottom diameter 60 mm, top diameter 30 mm and height 70 mm rests on HP on its base.", {
    solid: "frustum",
    dimensions: { diameter: 60, topDiameter: 30, height: 70 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("hemi-hp", "Hemisphere on HP", "Hemisphere", "A hemisphere of diameter 60 mm rests on HP on its flat face.", {
    solid: "hemisphere",
    dimensions: { diameter: 60 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("tetra-hp", "Tetrahedron on HP", "Tetrahedron", "A regular tetrahedron of side 50 mm rests on HP on its base.", {
    solid: "tetrahedron",
    dimensions: { side: 50 },
    restingPlane: "HP",
    inclinations: {},
  }),
  p("square-corner", "Square on corner, diagonal to VP", "Lamina • corner", "A square lamina ABCD of 30 mm side, rests on its corner C in HP. Its plane is inclined at 45° to the XY line such that its diagonal DB is parallel to the HP and inclined at 30° to the VP. Draw its projections when its corner D is towards the VP and 15 mm in front of it.", {
    solid: "plane",
    planeShape: "square",
    dimensions: { side: 30, distVP: 15 },
    restingPlane: "HP",
    inclinations: { HP: 45, VP: 30 },
    planeMode: "diagonal",
    diagonalAngleVP: 30,
  }),
  p("tri-vt25", "Triangle, VT above XY", "Lamina • VT", "An equilateral triangle of side 55 mm has its VT parallel to and 25 mm above XY. It has no HT. Draw its projections when one of its sides is inclined at 45 degrees to the VP.", {
    solid: "plane",
    planeShape: "triangle",
    dimensions: { side: 55 },
    restingPlane: "HP",
    inclinations: { VP: 45 },
    triKind: "equilateral",
    vtHeightMM: 25,
    noHT: true,
  }),
  p("square-vp30", "Square corner, sides ∥ VP", "Lamina • traces", "A square EFGH of side 50 mm has a corner on the HP and 30 mm in front of the VP. All the sides of the square are equally inclined to the HP and parallel to the VP. Draw its projections and show its traces.", {
    solid: "plane",
    planeShape: "square",
    dimensions: { side: 50, distVP: 30 },
    restingPlane: "HP",
    inclinations: {},
    restingKind: "corner",
    relations: { VP: "parallel" },
    diamond45: true,
    planeMode: "vertical",
  }),
  p("pent-40hp", "Pentagon ⊥ VP", "Lamina • 40° HP", "A regular pentagon of side 30 mm has one side on the ground. Its plane is inclined at 40 degrees to the HP and perpendicular to the VP. Draw its projections and show its traces.", {
    solid: "plane",
    planeShape: "pentagon",
    dimensions: { side: 30 },
    restingPlane: "HP",
    inclinations: { HP: 40 },
    restingKind: "edge",
    relations: { VP: "perpendicular" },
    planeMode: "edge",
  }),
  p("hex-3540", "Hexagon edge + yaw", "Lamina • 40°/40°", "Draw the projections of a regular hexagon of side 35 mm having one of its sides in the HP and the resting side makes an angle of 40 degrees to the VP. The planar surface makes an angle of 40 degrees to the HP.", {
    solid: "plane",
    planeShape: "hexagon",
    dimensions: { side: 35 },
    restingPlane: "HP",
    inclinations: { HP: 40, VP: 40 },
    restingKind: "edge",
    planeMode: "edge",
  }),
  p("rhombus-sq", "Rhombus → square plan", "Lamina • derive tilt", "PQRS is a rhombus having diagonal PR = 60 mm and QS = 40 mm and they are perpendicular to each other. The plane of the rhombus is inclined with the HP such that its top view appears to be a square. The top view of PR makes 60 degrees with the VP. Draw its projections and determine the inclination of the plane with the HP.", {
    solid: "plane",
    planeShape: "rhombus",
    dimensions: { diag1: 60, diag2: 40 },
    restingPlane: "HP",
    inclinations: { HP: 48.2, VP: 60 },
    rhombusSquareTop: true,
    planeMode: "rhombus",
  }),
  p("semi-vp", "Semicircle off VP", "Lamina • 30° VP", "A semi circular lamina of diameter 50 mm rests with its diametrical edge on the VP and the planar surface makes an angle of 30 degrees to the VP. Draw its projections.", {
    solid: "plane",
    planeShape: "semicircular",
    dimensions: { diameter: 50 },
    restingPlane: "VP",
    inclinations: { VP: 30 },
    restingKind: "edge",
    planeMode: "vpHinge",
  }),
  p("hex-vpcorner", "Hex corner in VP", "Lamina • VP corner", "A hexagonal plate of side 40 mm is resting on a corner in VP, with its surface making an angle of 30° with VP. The front view of the diagonal passing through that corner is inclined at 45° to the XY line. Draw the projections of the hexagonal plate.", {
    solid: "plane",
    planeShape: "hexagon",
    dimensions: { side: 40 },
    restingPlane: "VP",
    inclinations: { VP: 30 },
    restingKind: "corner",
    frontDiagXY: 45,
    planeMode: "diagonalVP",
  }),
];

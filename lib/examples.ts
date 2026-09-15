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
];

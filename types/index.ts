export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type SolidKind =
  | "cone"
  | "cylinder"
  | "frustum"
  | "hemisphere"
  | "tetrahedron"
  | "prism"
  | "pyramid"
  | "line"
  | "plane"
  | "box"
  | "sphere";

export type ProjectionMethod = "first" | "third";

export type RestingPlane = "HP" | "VP" | null;

export interface Inclinations {
  HP?: number;
  VP?: number;
}

export interface ParsedQuestion {
  solid: SolidKind;
  /** all dimensions in mm internally */
  dimensions: Record<string, number>;
  /** display unit detected */
  unit: "mm" | "cm" | "m";
  restingPlane: RestingPlane;
  inclinations: Inclinations;
  sides?: number;
  planeShape?: string;
  /** lamina construction: edge-resting tilt vs diagonal-horizontal corner resting */
  planeMode?: "edge" | "diagonal";
  diagonalAngleVP?: number;
  raw: string;
  confidence: number;
  unclear: string[];
  understood: { label: string; ok: boolean }[];
  axisLengthKey?: string;
}

export interface LabeledPoint3D {
  id: string;
  label: string;
  p: Vec3;
}

export interface Face3D {
  id: string;
  verts: number[]; // indices into vertices
  normal: Vec3;
  center: Vec3;
}

export interface Edge3D {
  id: string;
  a: number;
  b: number;
  faces: number[]; // face indices
  sharp: boolean;
  silhouetteOnly?: boolean;
  label?: string;
}

export interface BuiltSolid {
  kind: SolidKind;
  parsed: ParsedQuestion;
  vertices: LabeledPoint3D[];
  edges: Edge3D[];
  faces: Face3D[];
  axisDir: Vec3;
  baseCenter: Vec3;
  apex?: Vec3;
  topCenter?: Vec3;
  radius?: number;
  height?: number;
  length?: number;
  /** mm bounding box */
  bbox: { min: Vec3; max: Vec3; size: Vec3 };
  notes: string[];
}

export type ViewKind = "front" | "top" | "side";

export interface ProjPoint2D {
  id: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
  source: Vec3;
}

export interface ProjSegment2D {
  id: string;
  a: ProjPoint2D;
  b: ProjPoint2D;
  visible: boolean;
  kind: "outline" | "hidden" | "center" | "construction" | "projector" | "dimension" | "axis";
}

export interface ProjectionResult {
  view: ViewKind;
  points: ProjPoint2D[];
  segments: ProjSegment2D[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number };
}

export interface ConstructionStep {
  title: string;
  detail: string;
  student: string;
}

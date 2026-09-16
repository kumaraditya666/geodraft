"use client";
import { create } from "zustand";
import type { BuiltSolid, ParsedQuestion, ProjectionMethod, ViewKind } from "@/types";
import { buildSolid } from "@/lib/geometry/solids";
import { parseEngineeringQuestion, buildSteps } from "@/lib/parser/engineeringParser";
import { EXAMPLES } from "@/lib/examples";

export type Screen = "landing" | "workspace";
export type Scale = "1:1" | "1:2" | "1:5" | "1:10" | "2:1";

interface State {
  screen: Screen;
  question: string;
  parsed: ParsedQuestion | null;
  solid: BuiltSolid | null;
  needsConfirm: boolean;
  activeView: ViewKind | "all";
  showLabels: boolean;
  showRays: boolean;
  showAngles: boolean;
  showCenterLines: boolean;
  showHiddenLines: boolean;
  showDims: boolean;
  showProjectors: boolean;
  showTraces: boolean;
  projectionMethod: ProjectionMethod;
  centerMode: "3d" | "2d";
  studentMode: boolean;
  showHP: boolean;
  showVP: boolean;
  cameraPreset: string;
  cameraNonce: number;
  stepIndex: number;
  playing: boolean;
  splitMode: boolean;
  selectedPoint: string | null;
  sheetOpen: boolean;
  scale: Scale;
  unit: "mm" | "cm" | "m";
  saved: { id: string; title: string; question: string; ts: number }[];
  sidebar: string;
  explain: string | null;

  setQuestion: (q: string) => void;
  generate: (q?: string) => void;
  loadExample: (id: string) => void;
  applyParsed: (parsed: ParsedQuestion) => void;
  set: (p: Partial<State>) => void;
  confirmAnyway: () => void;
  saveCurrent: () => void;
  loadSaved: (id: string) => void;
}

const DEFAULT_Q =
  "A cone of base diameter 50 mm and height 70 mm rests on HP. Its axis makes 30° with VP. Draw its orthographic projections.";

function buildFromParsed(parsed: ParsedQuestion): BuiltSolid {
  return buildSolid(parsed);
}

function loadSavedList(): State["saved"] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("geodraft-saved") ?? "[]");
  } catch {
    return [];
  }
}

export const useStore = create<State>((set, get) => ({
  screen: "landing",
  question: DEFAULT_Q,
  parsed: null,
  solid: null,
  needsConfirm: false,
  activeView: "all",
  showLabels: true,
  showRays: true,
  showAngles: true,
  showCenterLines: true,
  showHiddenLines: true,
  showDims: true,
  showProjectors: true,
  showTraces: true,
  projectionMethod: "first",
  centerMode: "3d",
  studentMode: true,
  showHP: true,
  showVP: true,
  cameraPreset: "iso",
  cameraNonce: 0,
  stepIndex: 5,
  playing: false,
  splitMode: false,
  selectedPoint: null,
  sheetOpen: false,
  scale: "1:1",
  unit: "mm",
  saved: loadSavedList(),
  sidebar: "Visualizer",
  explain: null,

  setQuestion: (q) => set({ question: q }),
  set: (p) => set(p),

  generate: (q) => {
    const question = (q ?? get().question).trim() || DEFAULT_Q;
    const parsed = parseEngineeringQuestion(question);
    const solid = buildFromParsed({ ...parsed, restingPlane: parsed.restingPlane ?? "HP" });
    const needsConfirm = parsed.unclear.length > 0 || parsed.confidence < 70;
    set({
      question,
      parsed,
      solid,
      needsConfirm,
      screen: "workspace",
      stepIndex: 5,
      selectedPoint: null,
      explain: null,
      unit: parsed.unit ?? get().unit,
    });
  },

  loadExample: (id) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    const solid = buildFromParsed(ex.preset);
    set({
      question: ex.question,
      parsed: ex.preset,
      solid,
      needsConfirm: false,
      screen: "workspace",
      stepIndex: 5,
      selectedPoint: null,
      explain: null,
      unit: ex.preset.unit,
    });
  },

  applyParsed: (parsed) => {
    const solid = buildFromParsed(parsed);
    set({ parsed, solid, needsConfirm: false, unit: parsed.unit });
  },

  confirmAnyway: () => set({ needsConfirm: false }),

  saveCurrent: () => {
    const { question, parsed, saved } = get();
    const title = parsed
      ? `${cap(parsed.solid)} — ${parsed.inclinations.VP !== undefined ? `${parsed.inclinations.VP}° VP` : parsed.inclinations.HP !== undefined ? `${parsed.inclinations.HP}° HP` : "on HP"}`
      : question.slice(0, 28);
    const entry = { id: `${Date.now()}`, title, question, ts: Date.now() };
    const next = [entry, ...saved].slice(0, 30);
    try {
      localStorage.setItem("geodraft-saved", JSON.stringify(next));
    } catch { /* ignore */ }
    set({ saved: next });
  },

  loadSaved: (id) => {
    const s = get().saved.find((x) => x.id === id);
    if (s) get().generate(s.question);
  },
}));

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getSteps() {
  const parsed = useStore.getState().parsed;
  if (!parsed) return [];
  return buildSteps(parsed);
}

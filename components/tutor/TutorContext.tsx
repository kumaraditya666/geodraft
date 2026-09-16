"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { TourStep } from "@/lib/tutor/tourSteps";
import { TOUR_STEPS } from "@/lib/tutor/tourSteps";
import type { TutorAction } from "@/lib/tutor/knowledgeBase";

interface Spot {
  tour: string;
  route?: string;
  title: string;
  desc: string;
  once?: boolean;
}

export interface InjectedMsg {
  text: string;
  actions: TutorAction[];
}

interface TutorState {
  open: boolean;
  setOpen: (v: boolean) => void;
  beginner: boolean;
  setBeginner: (v: boolean) => void;
  tourIndex: number | null;
  startTour: (at?: number) => void;
  endTour: (completed?: boolean) => void;
  nextTour: () => void;
  prevTour: () => void;
  spot: Spot | null;
  showSpot: (s: Spot) => void;
  clearSpot: () => void;
  inject: InjectedMsg | null;
  clearInject: () => void;
  explainCurrent: (kind: "geometry" | "projection" | "construction") => void;
}

const Ctx = createContext<TutorState | null>(null);

export function useTutor(): TutorState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTutor outside TutorProvider");
  return v;
}

const get = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const put = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

export function TutorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [beginner, setBeginnerState] = useState(true);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [inject, setInject] = useState<InjectedMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (get("geodraft_beginner_mode") === null) {
      setBeginnerState(true); // ON by default for new users
    } else {
      setBeginnerState(get("geodraft_beginner_mode") !== "off");
    }
  }, []);

  const setBeginner = useCallback((v: boolean) => {
    setBeginnerState(v);
    put("geodraft_beginner_mode", v ? "on" : "off");
  }, []);

  const startTour = useCallback(
    (at = 0) => {
      const step = TOUR_STEPS[at];
      if (!step) return;
      setSpot(null);
      setOpen(false);
      if (step.wtab) {
        import("@/store/useStore").then(({ useStore }) => {
          useStore.getState().set({ wtab: step.wtab as "model" | "projection" | "construction" | "dimensions" | "sheet" | "export" });
        });
      }
      router.push(step.route);
      // wait a beat for the route to render before highlighting
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTourIndex(at), 450);
    },
    [router]
  );

  const endTour = useCallback((completed = false) => {
    setTourIndex(null);
    if (completed) put("geodraft_tutorial_completed", "yes");
  }, []);

  const nextTour = useCallback(() => {
    if (tourIndex === null) return;
    if (tourIndex >= TOUR_STEPS.length - 1) endTour(true);
    else startTour(tourIndex + 1);
  }, [tourIndex, startTour, endTour]);

  const prevTour = useCallback(() => {
    if (tourIndex === null || tourIndex === 0) return;
    startTour(tourIndex - 1);
  }, [tourIndex, startTour]);

  const showSpot = useCallback(
    (s: Spot) => {
      setTourIndex(null);
      if (s.route) router.push(s.route);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSpot(s), s.route ? 450 : 0);
    },
    [router]
  );

  const clearSpot = useCallback(() => setSpot(null), []);
  const clearInject = useCallback(() => setInject(null), []);

  /** Factual explanation of the LIVE model — values read from the store, never invented. */
  const explainCurrent = useCallback((kind: "geometry" | "projection" | "construction") => {
    import("@/store/useStore").then(({ useStore }) => {
      const st = useStore.getState();
      const solid = st.solid;
      if (!solid) {
        setInject({ text: "Generate a problem first — then I can explain its exact geometry.", actions: [] });
        setOpen(true);
        return;
      }
      const p = solid.parsed;
      const dims = Object.entries(p.dimensions)
        .map(([k, v]) => `${k} ${v} mm`)
        .join(", ");
      const ang =
        p.inclinations.HP !== undefined || p.inclinations.VP !== undefined
          ? ` Inclined ${p.inclinations.HP !== undefined ? `${p.inclinations.HP}° to HP` : ""}${
              p.inclinations.HP !== undefined && p.inclinations.VP !== undefined ? " and " : ""
            }${p.inclinations.VP !== undefined ? `${p.inclinations.VP}° to VP` : ""}.`
          : "";
      if (kind === "geometry") {
        setInject({
          text: `GeoDraft understood your problem as: ${solid.kind} (${dims}) resting on ${p.restingPlane ?? "HP"}.${ang} Built as ${solid.vertices.length} vertices and ${solid.edges.length} edges seated on the reference planes.`,
          actions: [{ type: "route", to: "/visualizer", label: "Open 3D model" }],
        });
      } else if (kind === "projection") {
        setInject({
          text: `Every 3D vertex projects three ways from the same coordinates: Front=(x,z) on VP, Top=(x,y) on HP, Side=(y,z). Far-side faces become dashed hidden lines; the axis gets a chain center line.`,
          actions: [{ type: "route", to: "/visualizer/projection", label: "Open projections" }],
        });
      } else {
        setInject({
          text: `Construction for this ${solid.kind}: XY reference → true shape (${dims}) → orientation${ang} → one projector per vertex → final views → true-size dimensions. Press Play on the Construction tab to watch it.`,
          actions: [{ type: "route", to: "/visualizer/construction", label: "Play construction" }],
        });
      }
      setOpen(true);
    });
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, beginner, setBeginner, tourIndex, startTour, endTour, nextTour, prevTour, spot, showSpot, clearSpot, inject, clearInject, explainCurrent }),
    [open, beginner, tourIndex, startTour, endTour, nextTour, prevTour, spot, showSpot, clearSpot, setBeginner, inject, clearInject, explainCurrent]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

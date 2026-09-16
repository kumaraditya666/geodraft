"use client";
import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { TOUR_STEPS } from "@/lib/tutor/tourSteps";
import { SHOW_ME } from "@/lib/tutor/tourSteps";
import { useTutor } from "./TutorContext";
import { HighlightOverlay, useTourRect } from "./UIHighlighter";

/** Full guided tour: highlights real UI across routes with progress + exit. */
export function GuidedTour() {
  const { tourIndex, nextTour, prevTour, endTour } = useTutor();
  const step = tourIndex === null ? null : TOUR_STEPS[tourIndex];
  const rect = useTourRect(step?.tour ?? null, step !== null);

  return (
    <AnimatePresence>
      {step && (
        <div key={`tour-${tourIndex}`} className="fixed inset-0 z-[70]">
          {rect && <HighlightOverlay rect={rect} />}
          <TourCard
            title={step.title}
            desc={step.desc}
            footer={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevTour}
                  disabled={tourIndex === 0}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button onClick={nextTour} className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-[12px] font-bold text-slate-950">
                  {tourIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"} <ChevronRight size={13} />
                </button>
                <button onClick={() => endTour(false)} className="rounded-lg px-2 py-1.5 text-[12px] text-slate-400 hover:text-slate-200">
                  Skip
                </button>
                <span className="ml-auto font-mono text-[10.5px] text-slate-500">
                  Step {(tourIndex ?? 0) + 1} of {TOUR_STEPS.length}
                </span>
              </div>
            }
            onClose={() => endTour(false)}
            rect={rect}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

/** Single-spot highlight ("Show me") with auto title/desc + close. */
export function SpotOverlay() {
  const { spot, clearSpot } = useTutor();
  const rect = useTourRect(spot?.tour ?? null, spot !== null);
  const meta = spot ? SHOW_ME[spot.tour] : null;

  useEffectDismiss(spot, clearSpot);

  return (
    <AnimatePresence>
      {spot && (
        <div key={`spot-${spot.tour}`} className="fixed inset-0 z-[70]">
          {rect && <HighlightOverlay rect={rect} pad={10} />}
          <TourCard
            title={meta?.title ?? spot.title}
            desc={meta?.desc ?? spot.desc}
            footer={
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-slate-500">Highlighted live in the app</span>
                <button onClick={clearSpot} className="ml-auto rounded-lg bg-cyan-400 px-3 py-1.5 text-[12px] font-bold text-slate-950">
                  Got it
                </button>
              </div>
            }
            onClose={clearSpot}
            rect={rect}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

function useEffectDismiss(spot: { once?: boolean } | null, clear: () => void) {
  useEffect(() => {
    if (!spot?.once) return;
    const t = setTimeout(clear, 7000);
    return () => clearTimeout(t);
  }, [spot, clear]);
}

function TourCard({
  title,
  desc,
  footer,
  onClose,
  rect,
}: {
  title: string;
  desc: string;
  footer: ReactNode;
  onClose: () => void;
  rect: { x: number; y: number; w: number; h: number } | null;
}) {
  // place below the highlight when room, else above
  const below = !rect || rect.y + rect.h + 210 < window.innerHeight;
  const style: CSSProperties = rect
    ? below
      ? { left: Math.min(Math.max(12, rect.x), window.innerWidth - 340), top: rect.y + rect.h + 14 }
      : { left: Math.min(Math.max(12, rect.x), window.innerWidth - 340), top: Math.max(12, rect.y - 210) }
    : { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22 }}
      className="glass glow-border pointer-events-auto fixed z-[71] w-[320px] max-w-[calc(100vw-24px)] rounded-2xl p-4"
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-[15px] font-bold leading-snug">{title}</div>
        <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:text-slate-200">
          <X size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{desc}</p>
      <div className="mt-3">{footer}</div>
    </motion.div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import { useStore } from "@/store/useStore";
import { buildDrawingGuide } from "@/lib/projection/drawingGuide";
import LabViewsSVG from "./LabViewsSVG";

export default function ProjectionLab() {
  const solid = useStore((s) => s.solid);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const loadExample = useStore((s) => s.loadExample);
  const set = useStore((s) => s.set);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animate, setAnimate] = useState(true);

  const steps = useMemo(() => (solid ? buildDrawingGuide(solid) : []), [solid]);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [solid]);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    const timer = setInterval(() => {
      const i = idx;
      if (i >= steps.length - 1) setPlaying(false);
      else setIdx(i + 1);
    }, 4200);
    return () => clearInterval(timer);
  }, [playing, idx, steps.length]);

  if (!solid || steps.length === 0) {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center">
        <Sparkles className="mx-auto text-cyan-300" size={26} />
        <div className="font-display mt-3 text-xl font-bold">Projection Lab</div>
        <p className="mt-2 text-sm text-slate-400">
          Generate a visualization first — then come back here to watch projectors build all three views step by step.
        </p>
        <button onClick={() => loadExample("cone-vp30")} className="mt-4 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950">
          Load cone example
        </button>
      </div>
    );
  }

  const step = steps[Math.min(idx, steps.length - 1)];
  const reveal = Math.min(5, Math.floor(((Math.min(idx, steps.length - 1) + 1) / steps.length) * 6));
  const activePoint = step.pointId ?? selectedPoint;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <div className="font-display text-lg font-bold">
            Projection Lab <span className="text-cyan-300">— how projectors draw the views</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {solid.kind.toUpperCase()} • cyan = vertical front↔top projectors (shared X) • pink = horizontal front↔side (shared Z) • gold = active point
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} className="rounded-lg border border-white/10 p-2 hover:border-cyan-300/40">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setPlaying(!playing)} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-[12px] font-bold text-slate-950">
            {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause" : "Play build-up"}
          </button>
          <button onClick={() => setIdx(Math.min(steps.length - 1, idx + 1))} className="rounded-lg border border-white/10 p-2 hover:border-cyan-300/40">
            <ChevronRight size={15} />
          </button>
          <button onClick={() => setAnimate(!animate)} className={`rounded-lg px-3 py-2 text-[12px] font-bold ${animate ? "bg-fuchsia-400 text-slate-950" : "border border-white/10"}`}>
            Projector FX
          </button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="glass min-h-[480px] overflow-hidden rounded-2xl p-2">
          <LabViewsSVG solid={solid} reveal={reveal} activePointId={activePoint} animateProjectors={animate} sweeping={playing && animate} />
        </div>

        <div className="flex flex-col gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.28 }}
              className="glass glow-border rounded-2xl p-4"
            >
              <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-cyan-300">
                DRAWING STEP {Math.min(idx, steps.length - 1) + 1} / {steps.length}
              </div>
              <div className="font-display mt-1.5 text-[17px] font-bold leading-snug">{step.title}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{step.how}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {step.views.map((v) => (
                  <span key={v} className="rounded-md bg-cyan-300/15 px-2 py-1 font-mono text-[10.5px] font-bold uppercase text-cyan-200">
                    {v} view
                  </span>
                ))}
                {step.pointId && (
                  <span className="rounded-md bg-amber-300/15 px-2 py-1 font-mono text-[10.5px] font-bold text-amber-200">
                    pulsing: {step.pointId}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="glass rounded-2xl p-2">
            {steps.map((st, i) => (
              <button
                key={st.title}
                onClick={() => { setIdx(i); setPlaying(false); }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] ${
                  i === Math.min(idx, steps.length - 1) ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold ${i <= idx ? "bg-cyan-400 text-slate-950" : "border border-white/15"}`}>
                  {i + 1}
                </span>
                <span className="leading-snug">{st.title}</span>
              </button>
            ))}
          </div>

          <button onClick={() => set({ selectedPoint: null })} className="rounded-xl border border-white/10 px-3 py-2 text-[12px] text-slate-400 hover:text-slate-200">
            Clear point highlight
          </button>
        </div>
      </div>
    </div>
  );
}

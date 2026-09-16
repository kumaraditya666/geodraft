"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Pause, Play, Sparkles,
  CheckCircle2, AlertTriangle, Download, Printer, ClipboardCheck, Boxes,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Scale } from "@/store/useStore";
import type { ProjectionMethod, ViewKind } from "@/types";
import { buildDrawingGuide } from "@/lib/projection/drawingGuide";
import { methodInfo } from "@/lib/projection/viewLayout";
import { buildDXF } from "@/lib/projection/dxfExporter";
import { downloadSVG, downloadText, printSheet } from "@/lib/projection/svgExporter";
import { runAccuracyChecks, checkDrawing } from "@/lib/verify/accuracy";
import LabViewsSVG from "./LabViewsSVG";
import TrueShapeModal from "./TrueShapeModal";

type Focus = "all" | ViewKind;

export default function ProjectionLab() {
  const solid = useStore((s) => s.solid);
  const selectedPoint = useStore((s) => s.selectedPoint);
  const loadExample = useStore((s) => s.loadExample);
  const set = useStore((s) => s.set);
  const method = useStore((s) => s.projectionMethod);
  const unit = useStore((s) => s.unit);
  const scale = useStore((s) => s.scale);
  const showHidden = useStore((s) => s.showHiddenLines);
  const showCenter = useStore((s) => s.showCenterLines);
  const showDims = useStore((s) => s.showDims);
  const showProj = useStore((s) => s.showProjectors);
  const showAngles = useStore((s) => s.showAngles);
  const showLabels = useStore((s) => s.showLabels);
  const showTraces = useStore((s) => s.showTraces);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animate, setAnimate] = useState(true);
  const [focus, setFocus] = useState<Focus>("all");
  const [checking, setChecking] = useState(false);
  const [showTrue, setShowTrue] = useState(false);

  const steps = useMemo(() => (solid ? buildDrawingGuide(solid) : []), [solid]);
  const mi = methodInfo(method as ProjectionMethod);

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

  const acc = useMemo(() => (solid ? runAccuracyChecks(solid) : []), [solid]);
  const draw = useMemo(
    () =>
      solid
        ? checkDrawing(solid, { method: method as ProjectionMethod, showHidden, showCenter, showDims, showAngles })
        : [],
    [solid, method, showHidden, showCenter, showDims, showAngles]
  );

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

  const exportDXF = () => {
    const dxf = buildDXF(solid, { method: method as ProjectionMethod, unit });
    downloadText(`geodraft-${solid.kind}-${method}-angle-mm.dxf`, dxf, "application/dxf");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* workstation toolbar */}
      <div className="glass rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          <div className="font-display text-[15px] font-bold">
            Projection Lab <span className="font-mono text-[10px] font-normal text-slate-500">{mi.title}</span>
          </div>
          <label className="flex items-center gap-1.5 text-slate-400">
            <span className="font-mono text-[10px] uppercase">Method</span>
            {(["first", "third"] as ProjectionMethod[]).map((mm) => (
              <button key={mm} onClick={() => set({ projectionMethod: mm })} className={`rounded-lg px-2.5 py-1 font-bold ${method === mm ? "bg-cyan-400 text-slate-950" : "border border-white/10 text-slate-300"}`}>
                {mm === "first" ? "First Angle" : "Third Angle"}
              </button>
            ))}
          </label>
          <label className="flex items-center gap-1.5 text-slate-400">
            <span className="font-mono text-[10px] uppercase">Units</span>
            {(["mm", "cm", "m"] as const).map((u) => (
              <button key={u} onClick={() => set({ unit: u })} className={`rounded-lg px-2 py-1 font-mono font-bold ${unit === u ? "bg-white text-slate-950" : "border border-white/10"}`}>{u}</button>
            ))}
          </label>
          <label className="flex items-center gap-1.5 text-slate-400">
            <span className="font-mono text-[10px] uppercase">Scale</span>
            {(["1:1", "1:2", "1:5", "1:10", "2:1"] as Scale[]).map((sc) => (
              <button key={sc} onClick={() => set({ scale: sc })} className={`rounded-lg px-2 py-1 font-mono font-bold ${scale === sc ? "bg-white text-slate-950" : "border border-white/10"}`}>{sc}</button>
            ))}
          </label>
          <label className="flex items-center gap-1.5 text-slate-400">
            <span className="font-mono text-[10px] uppercase">Views</span>
            {(["all", "front", "top", "side"] as Focus[]).map((v) => (
              <button key={v} onClick={() => setFocus(v)} className={`rounded-lg px-2.5 py-1 font-mono font-bold uppercase ${focus === v ? "bg-cyan-400 text-slate-950" : "border border-white/10"}`}>
                {v}
              </button>
            ))}
          </label>
        </div>
        <div className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">{mi.blurb} Display scale changes only the drawing size — all dimensions stay true millimeters.</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Toggle on={showHidden} label="Hidden" onClick={() => set({ showHiddenLines: !showHidden })} />
          <Toggle on={showCenter} label="Center" onClick={() => set({ showCenterLines: !showCenter })} />
          <Toggle on={showDims} label="Dims" onClick={() => set({ showDims: !showDims })} />
          <Toggle on={showProj} label="Projectors" onClick={() => set({ showProjectors: !showProj })} />
          <Toggle on={showAngles} label="Angles" onClick={() => set({ showAngles: !showAngles })} />
          <Toggle on={showLabels} label="Labels" onClick={() => set({ showLabels: !showLabels })} />
          <Toggle on={showTraces} label="Traces" onClick={() => set({ showTraces: !showTraces })} />
          <span className="mx-1 h-5 w-px bg-white/10" />
          {solid.kind === "plane" && (
            <button onClick={() => setShowTrue(true)} className="rounded-lg bg-cyan-300/15 px-3 py-1.5 text-[12px] font-bold text-cyan-200">
              TRUE SHAPE
            </button>
          )}
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button onClick={() => set({ wtab: "projection", sidebar: "Visualizer" })} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-slate-950">
            <Boxes size={13} /> 3D → 2D sheet
          </button>
          <button onClick={() => downloadSVG("lab-canvas", `geodraft-${solid.kind}-projection.svg`)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-200">
            <Download size={13} /> SVG
          </button>
          <button onClick={exportDXF} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-[12px] font-bold text-slate-950">
            <Download size={13} /> DXF (AutoCAD)
          </button>
          <button onClick={printSheet} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-200">
            <Printer size={13} /> PDF
          </button>
          <button onClick={() => setChecking(!checking)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold ${checking ? "bg-amber-300 text-slate-950" : "border border-amber-300/40 text-amber-200"}`}>
            <ClipboardCheck size={13} /> Check Projection
          </button>
        </div>
      </div>

      {checking && (
        <div className="glass grid gap-2 rounded-2xl p-4 md:grid-cols-2">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Geometry accuracy (measured from model)</div>
            <div className="mt-2 space-y-1.5">
              {acc.map((c) => <CheckRow key={c.id} item={c} />)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Drawing check ({mi.title})</div>
            <div className="mt-2 space-y-1.5">
              {draw.map((c) => <CheckRow key={c.id} item={c} />)}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Drawing build-up guide</div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} className="rounded-lg border border-white/10 p-2 hover:border-cyan-300/40">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setPlaying(!playing)} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-[12px] font-bold text-slate-950">
            {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause" : "Animate Projection"}
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
          <LabViewsSVG solid={solid} reveal={reveal} activePointId={activePoint} animateProjectors={animate} sweeping={playing && animate} focus={focus} />
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
      {showTrue && <TrueShapeModal solid={solid} onClose={() => setShowTrue(false)} />}
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold ${on ? "bg-cyan-400/90 text-slate-950" : "border border-white/10 text-slate-400"}`}>
      {label}
    </button>
  );
}

function CheckRow({ item }: { item: { label: string; pass: boolean; detail: string } }) {
  return (
    <div className={`flex gap-2 rounded-xl border px-3 py-2 ${item.pass ? "border-emerald-300/25 bg-emerald-300/5" : "border-amber-300/30 bg-amber-300/5"}`}>
      {item.pass ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" />}
      <div>
        <div className="text-[12.5px] font-bold">{item.pass ? "✓" : "⚠"} {item.label}</div>
        <div className="text-[12px] leading-snug text-slate-400">{item.detail}</div>
      </div>
    </div>
  );
}

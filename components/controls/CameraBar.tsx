"use client";
import { useStore } from "@/store/useStore";

const PRESETS = ["iso", "front", "top", "right", "left", "reset"] as const;

export default function CameraBar() {
  const cameraPreset = useStore((s) => s.cameraPreset);
  const ortho = useStore((s) => s.ortho3d);
  const isolate = useStore((s) => s.isolate3d);
  const set = useStore((s) => s.set);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => set({ cameraPreset: p, cameraNonce: Date.now() })}
          className={`pressable rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
            cameraPreset === p ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-black/40 text-slate-300 hover:border-cyan-300/40"
          }`}
        >
          {p === "iso" ? "Isometric" : p}
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-white/10" />
      <button
        onClick={() => set({ ortho3d: !ortho, cameraNonce: Date.now() })}
        title="Toggle orthographic / perspective camera"
        className={`pressable rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${ortho ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-black/40 text-slate-300 hover:border-cyan-300/40"}`}
      >
        {ortho ? "Ortho" : "Persp"}
      </button>
      <button
        onClick={() => set({ isolate3d: !isolate })}
        title="Isolate geometry (hide planes, rays, dimensions)"
        className={`pressable rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${isolate ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-black/40 text-slate-300 hover:border-cyan-300/40"}`}
      >
        Isolate
      </button>
    </div>
  );
}

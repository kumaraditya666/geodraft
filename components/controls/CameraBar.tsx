"use client";
import { useStore } from "@/store/useStore";

const PRESETS = ["iso", "front", "top", "right", "left", "reset"] as const;

export default function CameraBar() {
  const cameraPreset = useStore((s) => s.cameraPreset);
  const set = useStore((s) => s.set);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => set({ cameraPreset: p, cameraNonce: Date.now() })}
          className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
            cameraPreset === p ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-black/40 text-slate-300 hover:border-cyan-300/40"
          }`}
        >
          {p === "iso" ? "Isometric" : p}
        </button>
      ))}
    </div>
  );
}

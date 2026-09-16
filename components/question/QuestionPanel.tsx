"use client";
import { useState } from "react";
import { Pencil, Check, AlertTriangle } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { ParsedQuestion } from "@/types";

export default function QuestionPanel() {
  const question = useStore((s) => s.question);
  const parsed = useStore((s) => s.parsed);
  const solid = useStore((s) => s.solid);
  const needsConfirm = useStore((s) => s.needsConfirm);
  const applyParsed = useStore((s) => s.applyParsed);
  const confirmAnyway = useStore((s) => s.confirmAnyway);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ diameter: 50, height: 70, hp: 0, vp: 30, resting: "HP" });

  if (!parsed) return null;

  const startEdit = () => {
    const dia = parsed.dimensions.diameter ?? (parsed.dimensions.radius !== undefined ? parsed.dimensions.radius * 2 : 50);
    setForm({
      diameter: Math.round(dia),
      height: Math.round(parsed.dimensions.height ?? parsed.dimensions.length ?? 70),
      hp: parsed.inclinations.HP ?? 0,
      vp: parsed.inclinations.VP ?? 0,
      resting: parsed.restingPlane ?? "HP",
    });
    setEditing(true);
  };

  const apply = () => {
    const next: ParsedQuestion = {
      ...parsed,
      dimensions: { ...parsed.dimensions, diameter: form.diameter, height: form.height },
      inclinations: {
        ...(form.hp ? { HP: form.hp } : {}),
        ...(form.vp ? { VP: form.vp } : {}),
      },
      restingPlane: form.resting as "HP" | "VP",
    };
    applyParsed(next);
    setEditing(false);
  };

  // bare angle with no reference, e.g. "inclined 30 degrees" — ask, don't guess
  const angleAsk = parsed.unclear
    .map((u) => u.match(/^Angle ([\d.]+)° — with HP or VP\?$/))
    .find(Boolean);
  const applyAngleRef = (ref: "HP" | "VP") => {
    if (!angleAsk) return;
    const val = parseFloat(angleAsk[1]);
    const next: ParsedQuestion = {
      ...parsed,
      inclinations: { ...parsed.inclinations, [ref]: val },
      unclear: parsed.unclear.filter((u) => u !== angleAsk[0]),
      understood: [...parsed.understood, { label: `Angle with ${ref}: ${val}°`, ok: true }],
    };
    applyParsed(next);
  };

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Question</div>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{question}</p>

      {needsConfirm && (
        <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle size={15} /> Some parameters are unclear.
          </div>
          <ul className="mt-1.5 space-y-0.5 text-[12px] text-amber-100/80">
            {parsed.unclear.map((u) => (
              <li key={u}>• {u} ⚠</li>
            ))}
          </ul>
          <button onClick={confirmAnyway} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-1.5 text-[12px] font-bold text-slate-950">
            <Check size={13} /> Confirm & continue anyway
          </button>
        </div>
      )}

      {angleAsk && (
        <div className="mt-3 rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 p-3">
          <div className="text-sm font-semibold text-fuchsia-200">{angleAsk[1]}° with which reference?</div>
          <p className="mt-0.5 text-[12px] text-fuchsia-100/70">The question gives an angle but not what it is measured against. Pick one — nothing is assumed.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => applyAngleRef("HP")} className="flex-1 rounded-lg bg-fuchsia-300 px-3 py-1.5 text-[12px] font-bold text-slate-950">HP</button>
            <button onClick={() => applyAngleRef("VP")} className="flex-1 rounded-lg bg-fuchsia-300 px-3 py-1.5 text-[12px] font-bold text-slate-950">VP</button>
          </div>
        </div>
      )}

      <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Parsed parameters ✓</div>
      <div className="mt-2 space-y-1.5 text-[13px]">
        {parsed.understood.map((u) => (
          <div key={u.label} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5">
            <span className="text-slate-300">{u.label}</span>
            <span>{u.ok ? "✓" : "⚠"}</span>
          </div>
        ))}
        {solid?.notes.map((n) => (
          <div key={n} className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-2.5 py-1.5 text-[12px] text-cyan-100/90">
            {n}
          </div>
        ))}
      </div>

      {!editing ? (
        <button onClick={startEdit} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300/40">
          <Pencil size={14} /> Edit Parameters
        </button>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-[13px]">
          <div className="grid grid-cols-2 gap-2">
            <label>Diameter (mm)<input type="number" value={form.diameter} onChange={(e) => setForm({ ...form, diameter: +e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-1.5" /></label>
            <label>Height (mm)<input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: +e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-1.5" /></label>
            <label>Angle HP°<input type="number" value={form.hp} onChange={(e) => setForm({ ...form, hp: +e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-1.5" /></label>
            <label>Angle VP°<input type="number" value={form.vp} onChange={(e) => setForm({ ...form, vp: +e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-1.5" /></label>
          </div>
          <div className="flex gap-2">
            <button onClick={apply} className="flex-1 rounded-lg bg-cyan-400 py-1.5 font-bold text-slate-950">Apply</button>
            <button onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-white/15 py-1.5">Cancel</button>
          </div>
          <p className="text-[11px] text-slate-500">0° angle = field cleared (parallel). Geometry re-seats on {form.resting} automatically.</p>
        </div>
      )}

      <div className="mt-auto pt-3 font-mono text-[11px] text-slate-500">
        confidence {parsed.confidence}% • {solid?.kind} kernel • mm internal
      </div>
    </div>
  );
}

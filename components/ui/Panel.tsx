"use client";
import type { ReactNode } from "react";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[10.5px] text-slate-300">
      {children}
    </span>
  );
}

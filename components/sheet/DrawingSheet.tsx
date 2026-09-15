"use client";
import { X, Download } from "lucide-react";
import { useStore } from "@/store/useStore";
import AllViews from "@/components/projection/AllViews";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DrawingSheet() {
  const sheetOpen = useStore((s) => s.sheetOpen);
  const set = useStore((s) => s.set);
  const solid = useStore((s) => s.solid);
  const question = useStore((s) => s.question);
  const scale = useStore((s) => s.scale);
  const unit = useStore((s) => s.unit);

  if (!sheetOpen || !solid) return null;

  const exportSVG = () => {
    const el = document.getElementById("sheet-svg");
    if (!el) return;
    download("geodraft-sheet.svg", new XMLSerializer().serializeToString(el), "image/svg+xml");
  };

  const exportPNG = async () => {
    const el = document.getElementById("sheet-svg") as unknown as SVGSVGElement | null;
    if (!el) return;
    const xml = new XMLSerializer().serializeToString(el);
    const img = new Image();
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    img.src = `data:image/svg+xml;base64,${svg64}`;
    await new Promise((res) => (img.onload = res));
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 920;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "geodraft-sheet.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-[#f8fafc] p-6 text-slate-900">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">Drawing Sheet • A4 • First-angle</div>
          <div className="flex gap-2">
            <button onClick={exportSVG} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold"><Download size={13} /> SVG</button>
            <button onClick={exportPNG} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-bold text-white"><Download size={13} /> PNG</button>
            <button onClick={() => set({ sheetOpen: false })} className="rounded-lg border p-1.5"><X size={15} /></button>
          </div>
        </div>
        <h2 className="font-display mt-2 text-xl font-bold">Orthographic Projections — {solid.kind.toUpperCase()}</h2>
        <p className="mt-1 text-[13px] text-slate-600">{question}</p>
        <div id="sheet-svg" className="mt-4 overflow-hidden rounded-lg border-2 border-slate-900">
          <AllViews solid={solid} />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg border-2 border-slate-900 bg-slate-900 text-[12px]">
          {[
            ["Title", `GeoDraft AI — ${solid.kind}`],
            ["Scale", scale],
            ["Units", unit],
            ["Projection", "First-angle • XY"],
            ["Front", "(x, z) on VP"],
            ["Top", "(x, y) on HP"],
            ["Side", "(y, z)"],
            ["Sheet", "1 / 1"],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-3 py-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">{k}</div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-slate-500">
          Generated from single 3D source: baseCenter ({Math.round(solid.baseCenter.x)}, {Math.round(solid.baseCenter.y)}, {Math.round(solid.baseCenter.z)}) •
          axis ({solid.axisDir.x.toFixed(2)}, {solid.axisDir.y.toFixed(2)}, {solid.axisDir.z.toFixed(2)}) • All dimensions true-size.
        </p>
      </div>
    </div>
  );
}

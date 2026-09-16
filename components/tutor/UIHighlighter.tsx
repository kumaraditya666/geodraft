"use client";
import { useEffect, useState } from "react";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Tracks a [data-tour] element's on-screen rect (follows scroll/resize). */
export function useTourRect(tour: string | null, active: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!tour || !active) {
      setRect(null);
      return;
    }
    let tries = 0;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${tour}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      } else if (tries < 30) {
        tries += 1;
        raf = requestAnimationFrame(measure);
      } else {
        setRect(null);
      }
    };
    const t = setTimeout(measure, 350);
    const update = () => {
      const el = document.querySelector(`[data-tour="${tour}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [tour, active]);

  return rect;
}

/** Dim-everything-except-target overlay + glowing ring. Pointer-transparent. */
export function HighlightOverlay({ rect, pad = 8 }: { rect: Rect; pad?: number }) {
  const x = Math.max(4, rect.x - pad);
  const y = Math.max(4, rect.y - pad);
  const w = rect.w + pad * 2;
  const h = rect.h + pad * 2;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div className="absolute bg-black/55" style={{ left: 0, top: 0, right: 0, height: Math.max(0, y) }} />
      <div className="absolute bg-black/55" style={{ left: 0, top: y + h, right: 0, bottom: 0 }} />
      <div className="absolute bg-black/55" style={{ left: 0, top: y, width: Math.max(0, x), height: h }} />
      <div className="absolute bg-black/55" style={{ left: x + w, top: y, right: 0, height: h }} />
      <div className="tour-ring absolute rounded-xl" style={{ left: x, top: y, width: w, height: h }} />
    </div>
  );
}

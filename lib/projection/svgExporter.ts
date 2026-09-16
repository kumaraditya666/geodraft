"use client";

/** Serialize an inline SVG element and download it as a standalone .svg file. */
export function downloadSVG(svgId: string, filename: string): boolean {
  const el = document.getElementById(svgId) as unknown as SVGSVGElement | null;
  if (!el) return false;
  const clone = el.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const css = `.lab-march,.lab-march-fast{stroke-dasharray:7 6;}`;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = css;
  clone.insertBefore(style, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  downloadText(filename, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, "image/svg+xml");
  return true;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Print / save-as-PDF via the browser print dialog. */
export function printSheet(): void {
  window.print();
}

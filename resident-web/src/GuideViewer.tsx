import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { X, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import Sheet from "./Sheet";
import { prefersReducedMotion, spring } from "./motion";

export const GUIDE_SRC = "/segregation-guide.jpg";
export const GUIDE_THUMB = "/segregation-guide-thumb.webp";

// Full-screen preview of the society's waste segregation poster. Tap the poster to zoom.
export default function GuideViewer({ onClose }: { onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  // Zooms in on the spot that was tapped. The size changes at once and a transform plays the movement,
  // because resizing a large image on every frame would stutter.
  function toggleZoom(point?: { x: number; y: number }) {
    const el = img.current, scroller = box.current;
    if (!el || !scroller) return;
    const from = el.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const at = point ?? { x: view.left + view.width / 2, y: view.top + view.height / 2 };
    const fx = (at.x - from.left) / from.width, fy = (at.y - from.top) / from.height;
    flushSync(() => setZoomed((z) => !z));
    const grown = el.getBoundingClientRect();
    scroller.scrollLeft += grown.left + fx * grown.width - at.x;
    scroller.scrollTop += grown.top + fy * grown.height - at.y;
    if (prefersReducedMotion()) return;
    const to = el.getBoundingClientRect();
    el.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` }, { transform: "none" }],
      { duration: 520, easing: spring("snappy") },
    );
  }

  return (
    <Sheet label="Waste segregation guide" onClose={onClose} dark className="flex flex-col">
      <div data-sheet-handle className="mx-auto flex w-full max-w-[480px] shrink-0 items-center justify-between px-5 pb-3 pt-5 text-white">
        <div>
          <p className="font-display text-lg font-extrabold leading-tight">Segregation guide</p>
          <p className="text-xs opacity-70">Tap the poster to zoom</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleZoom()} aria-label={zoomed ? "Zoom out" : "Zoom in"}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 active:scale-95">{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button>
          <a href={GUIDE_SRC} target="_blank" rel="noopener" aria-label="Open full size"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 active:scale-95"><ExternalLink size={18} /></a>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-butter text-ink active:scale-95"><X size={20} /></button>
        </div>
      </div>

      <div ref={box} data-nodrag className="min-h-0 flex-1 overflow-auto overscroll-contain px-3 pb-6" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
        <img ref={img} src={GUIDE_SRC} alt="Ajmera Infinity waste segregation guideline poster" width={825} height={1164} decoding="async" onClick={(e) => toggleZoom({ x: e.clientX, y: e.clientY })} draggable={false}
          style={{ viewTransitionName: "poster" }}
          className={`mx-auto block h-auto origin-top-left rounded-2xl bg-white ${zoomed ? "w-[230%] max-w-none cursor-zoom-out" : "w-full max-w-[480px] cursor-zoom-in"}`} />
      </div>
    </Sheet>
  );
}

import { useEffect, useState } from "react";
import { X, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";

export const GUIDE_SRC = "/segregation-guide.jpg";

// Full-screen preview of the society's waste segregation poster. Tap the poster to zoom.
export default function GuideViewer({ onClose }: { onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1f19]" role="dialog" aria-label="Waste segregation guide">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-5 pb-3 pt-4 text-white">
        <div>
          <p className="font-display text-lg font-extrabold leading-tight">Segregation guide</p>
          <p className="text-xs opacity-70">Tap the poster to zoom</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? "Zoom out" : "Zoom in"}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 active:scale-95">{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button>
          <a href={GUIDE_SRC} target="_blank" rel="noopener" aria-label="Open full size"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 active:scale-95"><ExternalLink size={18} /></a>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-butter text-ink active:scale-95"><X size={20} /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-6" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
        <img src={GUIDE_SRC} alt="Ajmera Infinity waste segregation guideline poster" onClick={() => setZoomed((z) => !z)} draggable={false}
          className={`mx-auto block rounded-2xl bg-white transition-[width] duration-300 ${zoomed ? "w-[230%] max-w-none cursor-zoom-out" : "w-full max-w-[480px] cursor-zoom-in"}`} />
      </div>
    </div>
  );
}

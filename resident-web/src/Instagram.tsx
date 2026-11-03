import { useEffect, useRef, useState } from "react";

const HANDLE = "ajmera_infinity_ecotroop";
export const INSTAGRAM_URL = `https://www.instagram.com/${HANDLE}`;
const GRADIENT = "bg-[linear-gradient(45deg,#feda75,#fa7e1e_30%,#d62976_55%,#962fbf_80%,#4f5bd5)]";

function Glyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Small round logo that links to the page, for the dashboard header.
export function InstagramButton() {
  return (
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="EcoTroop on Instagram" title="EcoTroop on Instagram"
      className={`grid h-10 w-10 place-items-center rounded-full border-2 border-ink text-white active:scale-95 ${GRADIENT}`}><Glyph size={19} /></a>
  );
}

// Instagram's profile embed: the latest posts and reels, updated automatically whenever the page posts.
export default function InstagramSection() {
  const [loaded, setLoaded] = useState(false);
  const [near, setNear] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-center gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink text-white ${GRADIENT}`}><Glyph size={22} /></div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold leading-tight">EcoTroop in action</h2>
          <p className="truncate text-[13px] font-medium opacity-60">@{HANDLE}</p>
        </div>
      </div>

      <div className="card overflow-hidden bg-white [container-type:inline-size]">
        <div ref={box} className={`relative h-[380px] h-[calc(148px+66.67cqw)] ${near && !loaded ? "skeleton" : ""}`}>
          {near && <iframe src={`${INSTAGRAM_URL}/embed/`} title="Latest posts and reels from EcoTroop on Instagram" scrolling="no"
            onLoad={() => setLoaded(true)} className={`h-full w-full border-0 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`} />}
        </div>
      </div>

      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
        className={`press card mt-3 flex items-center justify-center gap-2.5 py-3.5 font-display text-[17px] font-extrabold text-white ${GRADIENT}`}>
        <Glyph size={20} /> See all on Instagram
      </a>
    </section>
  );
}

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { BinId } from "./api";
import { BIN_INFO, BinArt, BinFace, ORDER } from "./Bins";
import { haptic, prefersReducedMotion } from "./motion";

const INK = "#12332a";
const STEP = Math.PI / 2;
const SIZE = 92;
const STIFFNESS = 90, DAMPING = 13; // a soft settle with a touch of overshoot
const EXAMPLES: Record<BinId, string[]> = {
  wet: ["Peels", "Leftovers", "Tea bags", "Egg shells"],
  dry: ["Plastic", "Paper", "Metal cans", "Cartons"],
  reject: ["Diapers", "Tissues", "Pet hair", "Dust"],
  hazardous: ["Batteries", "Bulbs", "Medicines", "Paint"],
};

// The four bins on a turntable: flick it round with a finger, and it spins, slows and settles on one.
export default function BinCarousel({ onAsk }: { onAsk: (q: string) => void }) {
  const [front, setFront] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const turn = useRef<{ by: (steps: number) => void }>({ by: () => {} });
  const ask = (i: number) => onAsk(`What goes in ${BIN_INFO[ORDER[i]].label.toLowerCase()}?`);
  const latestAsk = useRef(ask);
  latestAsk.current = ask;

  useLayoutEffect(() => {
    const box = stage.current;
    if (!box) return;
    const bins = [...box.querySelectorAll<HTMLElement>("[data-bin]")];
    const prints = bins.map((b) => b.querySelector<HTMLElement>(".bin-print"));
    const table = box.querySelector<HTMLElement>(".bin-table");
    const disc = box.querySelector<HTMLElement>(".bin-disc");
    const layers = bins.map(() => -1);
    let angle = 0, speed = 0, target = 0, raf = 0, last = 0, radius = 110, nearest = 0, dragging = false, touched = false, onScreen = false;

    // Each bin sits on a circle seen at an angle, and its print slides around it as it turns, like a real round bin.
    const draw = () => {
      bins.forEach((bin, i) => {
        const a = angle + i * STEP, sin = Math.sin(a), cos = Math.cos(a), near = (cos + 1) / 2;
        bin.style.transform = `translate3d(${(radius * sin).toFixed(2)}px, ${(radius * 0.3 * cos).toFixed(2)}px, 0) scale(${(0.62 + 0.38 * near).toFixed(3)})`;
        bin.style.opacity = (0.72 + 0.28 * near).toFixed(3);
        const layer = Math.round(near * 10);
        if (layer !== layers[i]) { layers[i] = layer; bin.style.zIndex = String(layer); }
        const print = prints[i];
        if (print) {
          const facing = Math.atan2(sin, cos) * 0.62, across = Math.cos(facing);
          print.style.transform = `translateX(${(SIZE * 0.25 * Math.sin(facing)).toFixed(2)}px) scaleX(${Math.max(across, 0.001).toFixed(3)})`;
          print.style.opacity = across > 0.05 ? "1" : "0";
        }
      });
      if (disc) disc.style.transform = `rotateX(72.5deg) rotateZ(${angle.toFixed(4)}rad)`;
      const now = ((Math.round(-angle / STEP) % 4) + 4) % 4;
      if (now !== nearest) {
        nearest = now;
        setFront(now);
        if (touched) haptic(4);
      }
    };
    const tick = (t: number) => {
      raf = 0;
      if (!dragging) {
        const dt = Math.min(Math.max(t - last, 4), 34) / 1000;
        last = t;
        speed += (-STIFFNESS * (angle - target) - DAMPING * speed) * dt;
        angle += speed * dt;
        if (Math.abs(angle - target) < 0.001 && Math.abs(speed) < 0.01) { angle = target; speed = 0; draw(); return; }
        raf = requestAnimationFrame(tick);
      }
      draw();
    };
    const run = () => {
      if (prefersReducedMotion()) { angle = target; speed = 0; draw(); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    const toBin = (i: number) => {
      const way = -i * STEP - target;
      target += way - Math.round(way / (Math.PI * 2)) * Math.PI * 2;
      run();
    };
    turn.current.by = (steps) => { touched = true; target = Math.round(target / STEP) * STEP - steps * STEP; run(); };

    const size = () => {
      radius = Math.min(box.clientWidth * 0.33, 128);
      table?.style.setProperty("--r", `${radius + 38}px`);
      draw();
    };
    size();
    const resize = new ResizeObserver(size);
    resize.observe(box);

    const down = (e: PointerEvent) => {
      if (e.button) return;
      touched = true;
      dragging = true;
      speed = 0;
      const hit = (e.target as Element).closest<HTMLElement>("[data-bin]");
      let x = e.clientX, time = e.timeStamp, travelled = 0;
      const move = (m: PointerEvent) => {
        if (m.pointerId !== e.pointerId) return;
        const dx = m.clientX - x, dt = Math.max(1, m.timeStamp - time);
        travelled += Math.abs(dx);
        angle += dx / radius;
        speed = speed * 0.4 + ((dx / radius / dt) * 1000) * 0.6;
        x = m.clientX; time = m.timeStamp;
        if (!raf) raf = requestAnimationFrame(tick);
      };
      const end = (u: PointerEvent) => {
        if (u.pointerId !== e.pointerId) return;
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", end);
        removeEventListener("pointercancel", end);
        dragging = false;
        // A tap on the front bin asks about it; a tap on any other brings it round. A flick carries on and settles.
        if (u.type === "pointerup" && travelled < 8 && hit) {
          const i = Number(hit.dataset.bin);
          speed = 0;
          if (i === nearest) { target = Math.round(angle / STEP) * STEP; run(); latestAsk.current(i); }
          else { target = angle; toBin(i); }
          return;
        }
        if (u.timeStamp - time > 90) speed = 0;
        target = Math.round((angle + speed * 0.2) / STEP) * STEP;
        run();
      };
      addEventListener("pointermove", move, { passive: true });
      addEventListener("pointerup", end, { passive: true });
      addEventListener("pointercancel", end, { passive: true });
    };
    box.addEventListener("pointerdown", down, { passive: true });

    // Until someone has a go, it turns by itself now and then, so they can see it's alive.
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.4 });
    io.observe(box);
    const idle = setInterval(() => {
      const html = document.documentElement;
      if (touched || !onScreen || document.hidden || html.dataset.sheet || html.classList.contains("lite") || prefersReducedMotion()) return;
      target = Math.round(target / STEP) * STEP - STEP;
      run();
    }, 4200);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(idle);
      io.disconnect();
      resize.disconnect();
      box.removeEventListener("pointerdown", down);
    };
  }, []);

  const bin = ORDER[front];
  return (
    <section className="card relative mt-3 overflow-hidden" aria-label="Meet the bins">
      {ORDER.map((b) => <span key={b} aria-hidden="true" className={`bin-tone absolute inset-0 ${BIN_INFO[b].tone} ${b === bin ? "is-front" : ""}`} />)}

      <div className="relative flex items-center justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-extrabold leading-tight">Meet the bins</h2>
          <p className="text-[13px] font-medium opacity-65">Give them a spin</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button onClick={() => turn.current.by(-1)} aria-label="Previous bin" className="press grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white"><ChevronLeft size={18} /></button>
          <button onClick={() => turn.current.by(1)} aria-label="Next bin" className="press grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div ref={stage} className="bin-stage relative">
        <div className="bin-table" aria-hidden="true">
          <span className="bin-disc-edge" />
          <span className="bin-disc">
            <svg viewBox="-100 -100 200 200" className="block h-full w-full">
              <circle r="98.5" fill="#fff" stroke={INK} strokeWidth="3" />
              <circle r="74" fill="none" stroke={INK} strokeOpacity=".2" strokeWidth="3" strokeDasharray="8 12" />
            </svg>
          </span>
        </div>
        {ORDER.map((b, i) => (
          <button key={b} data-bin={i} tabIndex={b === bin ? 0 : -1} aria-label={`${BIN_INFO[b].label}. What goes in it?`} onClick={(e) => { if (e.detail === 0) ask(i); }} className={`bin-spot ${b === bin ? "is-front" : ""}`}>
            <span className="bin-toy relative block"><BinArt bin={b} size={SIZE} face={false} /><BinFace bin={b} size={SIZE} /></span>
          </button>
        ))}
      </div>

      <div className="relative grid px-4 pt-1 text-center">
        {ORDER.map((b) => (
          <div key={b} aria-hidden={b !== bin} className={`bin-label [grid-area:1/1] ${b === bin ? "is-front" : ""}`}>
            <p className="font-display text-xl font-extrabold leading-tight">{BIN_INFO[b].label}</p>
            <p className="mt-0.5 text-[13px] font-medium opacity-70">{BIN_INFO[b].where}</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
              {EXAMPLES[b].map((item, n) => <li key={item} style={{ "--i": n } as CSSProperties} className="bin-chip rounded-full border-[1.5px] border-ink/25 bg-white/80 px-2.5 py-0.5 text-[13px] font-medium">{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative px-4 pb-4 pt-3">
        <button onClick={() => ask(front)} className="press card flex h-11 w-full items-center justify-center gap-2 bg-white font-display text-[15px] font-extrabold">What goes in here? <ArrowRight size={17} /></button>
      </div>
    </section>
  );
}

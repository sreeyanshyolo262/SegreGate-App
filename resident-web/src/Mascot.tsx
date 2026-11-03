import { useEffect, useRef } from "react";
import { haptic, prefersReducedMotion, spring } from "./motion";

export type Mood = "idle" | "listening" | "thinking" | "happy";

// Every mascot on screen shares one listener, so their eyes can follow a finger or cursor cheaply.
const watchers = new Set<(x: number, y: number) => void>();
let queued = false, px = 0, py = 0;
function emit(e: PointerEvent) {
  if (e.type === "pointermove" && e.pointerType !== "mouse") return;
  px = e.clientX; py = e.clientY;
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; watchers.forEach((w) => w(px, py)); });
}
function watchPointer(fn: (x: number, y: number) => void) {
  if (!watchers.size) { addEventListener("pointermove", emit, { passive: true }); addEventListener("pointerup", emit, { passive: true }); }
  watchers.add(fn);
  return () => {
    watchers.delete(fn);
    if (!watchers.size) { removeEventListener("pointermove", emit); removeEventListener("pointerup", emit); }
  };
}

// One full turn, worked out as if the body really were round: the face slides around the front and out of sight, and the leaf circles the lid.
const TURN = Array.from({ length: 25 }, (_, i) => (i / 24) * Math.PI * 2);
const FACE_TURN = TURN.map((a) => ({ transform: `translateX(${(Math.sin(a) * 27).toFixed(2)}px) scaleX(${Math.max(Math.cos(a), 0.001).toFixed(3)})`, opacity: Math.cos(a) > 0 ? 1 : 0 }));
const LEAF_TURN = TURN.map((a) => ({ transform: `translate(${((Math.cos(a) - 1) * 20).toFixed(2)}px, ${(-Math.sin(a) * 5).toFixed(2)}px) scaleX(${Math.cos(a).toFixed(3)})` }));

const BODY = "M14.5 33Q42 47 69.5 33L64 77Q42 88 20 77z";
let nextClip = 0;

interface Props {
  size?: number;
  mood?: Mood;
  bump?: number; // changes when something happens that it should react to, such as a keypress
  poke?: boolean; // spins round when tapped
  className?: string;
}

// A friendly round bin with a face. It blinks, glances around, turns to watch your finger, and tips its lid while thinking.
export function Mascot({ size = 72, mood = "idle", bump = 0, poke = false, className = "" }: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLSpanElement>(null);
  const face = useRef<SVGGElement>(null);
  const look = useRef<SVGGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const leaf = useRef<SVGPathElement>(null);
  const clip = useRef(`buddy-clip-${++nextClip}`);
  const moodNow = useRef(mood);
  moodNow.current = mood;

  const hop = (height: number, ms: number) => {
    if (prefersReducedMotion()) return;
    root.current?.animate([{ transform: "none" }, { transform: `translateY(-${height}px) scale(1.03, .97)`, offset: 0.35 }, { transform: "none" }], { duration: ms, easing: "ease-out" });
  };
  // The eyes move a little and the whole face a little more, so it looks like the body is turning.
  const setLook = (x: number, y: number) => {
    if (look.current) look.current.style.transform = `translate(${x}px, ${y}px)`;
    if (face.current) face.current.style.transform = `translate(${x * 2.4}px, ${y * 0.8}px)`;
  };

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const el = root.current;
    let visible = true, lastPointer = 0;
    let blinkTimer = 0, glanceTimer = 0, backTimer = 0, unblink = 0;
    // Rests while off-screen or covered by a sheet, when nobody can see it.
    const awake = () => visible && !document.hidden && !(document.documentElement.dataset.sheet && el.closest(".page"));

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const stopWatching = watchPointer((x, y) => {
      if (!awake() || moodNow.current !== "idle") return;
      const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.55);
      const d = Math.hypot(dx, dy) || 1, reach = Math.min(d / 80, 1);
      lastPointer = performance.now();
      setLook((dx / d) * 2.4 * reach, (dy / d) * 1.8 * reach);
    });

    const blink = () => {
      blinkTimer = window.setTimeout(() => {
        if (awake() && eyes.current) {
          eyes.current.classList.add("blink");
          unblink = window.setTimeout(() => eyes.current?.classList.remove("blink"), 170);
        }
        blink();
      }, 2400 + Math.random() * 3600);
    };
    const glance = () => {
      glanceTimer = window.setTimeout(() => {
        if (awake() && moodNow.current === "idle" && performance.now() - lastPointer > 3000) {
          setLook((Math.random() - 0.5) * 4.4, (Math.random() - 0.5) * 2.4);
          backTimer = window.setTimeout(() => { if (moodNow.current === "idle") setLook(0, 0); }, 900);
        }
        glance();
      }, 3200 + Math.random() * 4200);
    };
    blink();
    glance();

    return () => {
      io.disconnect();
      stopWatching();
      clearTimeout(blinkTimer); clearTimeout(glanceTimer); clearTimeout(backTimer); clearTimeout(unblink);
    };
  }, []);

  // Listening looks down at the box being typed in. Happy gives a pleased little hop.
  useEffect(() => {
    if (mood !== "thinking") setLook(0, mood === "listening" ? 2 : 0);
    if (mood === "happy") hop(9, 480);
  }, [mood]);

  useEffect(() => { if (bump) hop(3.5, 220); }, [bump]);

  function onPoke() {
    if (!poke || !root.current || prefersReducedMotion()) return;
    haptic(6);
    root.current.classList.remove("poked");
    void root.current.offsetWidth;
    root.current.classList.add("poked");
    root.current.animate([
      { transform: "none" },
      { transform: "translateY(-14px) scale(1.04, .97)", offset: 0.3 },
      { transform: "translateY(0) scale(1.05, .95)", offset: 0.72 },
      { transform: "none" },
    ], { duration: 950, easing: spring("soft") });
    const turn = { duration: 950, easing: "cubic-bezier(.45, 0, .25, 1)" };
    face.current?.animate(FACE_TURN, turn);
    leaf.current?.animate(LEAF_TURN, turn);
  }

  const ink = "#12332a";
  return (
    <span ref={root} className={`mascot ${poke ? "can-poke" : ""} ${className}`} data-mood={mood} style={{ width: size, height: size * 1.1 }} onClick={onPoke} aria-hidden="true">
      <span ref={body} className={`mascot-body ${size >= 50 ? "breathe" : ""}`}>
        <svg width={size} height={size * 1.1} viewBox="0 0 84 92" className="block overflow-visible">
          <clipPath id={clip.current}><path d={BODY} /></clipPath>
          <ellipse cx="42" cy="88" rx="30" ry="3.4" fill={ink} opacity=".16" />
          <ellipse cx="26" cy="82.5" rx="6" ry="6.3" fill={ink} />
          <ellipse cx="58" cy="82.5" rx="6" ry="6.3" fill={ink} />
          <path d={BODY} fill="#a8e6b8" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M60 46L67.6 41L63.3 76Q58.5 78.8 53 80.5z" fill="#86d79c" />
          <path d="M15.7 38.5Q42 53 68.3 38.5L67.6 44Q42 58.5 16.4 44z" fill="#86d79c" />
          <path d="M23.5 50L26 72" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3.5" strokeLinecap="round" />
          <g clipPath={`url(#${clip.current})`}>
            <g ref={face} className="buddy-face">
              <circle cx="26.5" cy="68" r="4.2" fill="#ffc9b0" />
              <circle cx="57.5" cy="68" r="4.2" fill="#ffc9b0" />
              <g ref={look} className="buddy-look">
                <g ref={eyes} className="buddy-eyes">
                  <circle cx="33" cy="60" r="4" fill={ink} />
                  <circle cx="51" cy="60" r="4" fill={ink} />
                  <circle cx="34.4" cy="58.6" r="1.3" fill="#fff" />
                  <circle cx="52.4" cy="58.6" r="1.3" fill="#fff" />
                </g>
              </g>
              <path d={mood === "happy" ? "M33.5 67.5c2.4 6 14.6 6 17 0" : "M35 69c2.2 3.6 11.8 3.6 14 0"} fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>
          <g className="buddy-lid">
            <path d="M9 27v6c0 5.2 14.8 9.5 33 9.5s33-4.3 33-9.5v-6" fill="#2f9e5a" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
            <ellipse cx="42" cy="27" rx="33" ry="9.5" fill="#57bd7c" stroke={ink} strokeWidth="3" />
            <path d="M33 25c0-6.4 4-9 9-9s9 2.6 9 9" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
            <path d="M17 24c3.4-2.3 8-3.8 13-4.5" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="2.4" strokeLinecap="round" />
            <path ref={leaf} className="buddy-leaf" d="M62 21c-1-7 2-11 9-13 1 7-2 11-9 13z" fill="#a8e6b8" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
          </g>
        </svg>
      </span>
    </span>
  );
}

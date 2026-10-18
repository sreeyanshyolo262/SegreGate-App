import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createWorld } from "./scene";
import { createIcons, Check, Minus, X, Camera, Star, Flame, Trophy, TrendingUp, Target, Gift, Sprout, BatteryCharging, MessageCircle, Repeat, ChartColumn } from "lucide";

createIcons({ icons: { Check, Minus, X, Camera, Star, Flame, Trophy, TrendingUp, Target, Gift, Sprout, BatteryCharging, MessageCircle, Repeat, ChartColumn }, attrs: { "stroke-width": 2.4 } });

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = <T extends Element>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends Element>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

// ---------- smooth scroll ----------
const lenis = reduce ? null : new Lenis({ lerp: 0.09 });
if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const target = $<HTMLElement>(a.getAttribute("href")!);
    if (lenis) lenis.scrollTo(target, { duration: 2, offset: target.id === "tour" ? 0 : 0 });
    else target.scrollIntoView();
  }),
);

// ---------- 3D world ----------
const world = createWorld($<HTMLCanvasElement>("#bg"));
addEventListener("resize", () => { world.resize(); ScrollTrigger.refresh(); });

const mouse = { x: 0, y: 0 }, mouseT = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { mouseT.x = (e.clientX / innerWidth - 0.5) * 2; mouseT.y = -(e.clientY / innerHeight - 0.5) * 2; });

const sections = $$<HTMLElement>("main > section");
let centers: number[] = [];
const measure = () => { centers = sections.map((s) => s.offsetTop + s.offsetHeight / 2); };

function sectionIndex(y: number) {
  const mid = y + innerHeight / 2;
  if (mid <= centers[0]) return 0;
  for (let i = 0; i < centers.length - 1; i++) {
    if (mid <= centers[i + 1]) return i + (mid - centers[i]) / (centers[i + 1] - centers[i]);
  }
  return centers.length - 1;
}

const hud = $<HTMLElement>("#hud"), hudLabel = $("#hudLabel"), hudResult = $("#hudResult");
const rail = $<HTMLElement>("#rail .dot");
const RESULT = { clean: "Clean", minor: "Minor", major: "Major" } as const;

let p = 0, ps = 0, sec = 0, ss = 0;
const clock = performance.now();

function frame() {
  const t = (performance.now() - clock) / 1000;
  const y = lenis ? lenis.scroll : scrollY;
  const limit = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  p = Math.min(1, Math.max(0, y / limit));
  sec = sectionIndex(y);
  ps += (p - ps) * 0.14;
  ss += (sec - ss) * 0.12;
  mouse.x += (mouseT.x - mouse.x) * 0.05;
  mouse.y += (mouseT.y - mouse.y) * 0.05;

  const state = world.update(ps, ss, t, mouse);
  if (state) {
    hud.dataset.status = state.status;
    hudLabel.textContent = state.label;
    hudResult.textContent = state.status === "major" ? "Major · 0 pts" : `${RESULT[state.status]} +${state.pts}`;
    hud.classList.add("show");
  } else hud.classList.remove("show");

  rail.style.top = `${ps * 100}%`;
  document.body.classList.toggle("dark", ss > 8.7);
}
gsap.ticker.add(frame);

// ---------- headline split + reveals ----------
$$<HTMLElement>(".split").forEach((el) => {
  const words = el.textContent!.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w"><span>${w}</span></span>`).join(" ");
  if (reduce) return;
  gsap.from($$("span.w > span", el), {
    yPercent: 115, rotate: 4, duration: 1, ease: "power4.out", stagger: 0.06,
    scrollTrigger: { trigger: el, start: "top 88%" },
  });
});

if (!reduce) {
  $$<HTMLElement>(".reveal").forEach((el, i) => {
    gsap.from(el, { y: 46, opacity: 0, duration: 0.9, ease: "power3.out", delay: (i % 3) * 0.05, scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  // floating parallax on browser windows
  $$<HTMLElement>("[data-speed]").forEach((el) => {
    const s = parseFloat(el.dataset.speed!);
    gsap.fromTo(el, { y: s * 220 }, { y: -s * 220, ease: "none", scrollTrigger: { trigger: el.closest("section")!, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // big outline words slide sideways while you scroll down
  $$<HTMLElement>(".bigword").forEach((el) => {
    const dx = parseFloat(el.dataset.x!);
    gsap.fromTo(el, { xPercent: -dx }, { xPercent: dx, ease: "none", scrollTrigger: { trigger: el.closest("section")!, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // phone orbs
  gsap.to(".o1", { y: -120, scrollTrigger: { trigger: "#tour", start: "top top", end: "bottom bottom", scrub: true } });
  gsap.to(".o2", { y: 140, scrollTrigger: { trigger: "#tour", start: "top top", end: "bottom bottom", scrub: true } });
}

// ---------- pinned resident-app tour ----------
const steps = $$<HTMLElement>(".steps li");
const shots = $$<HTMLElement>(".phone .shot");
let current = 0;
function setStep(i: number) {
  if (i === current) return;
  current = i;
  steps.forEach((s, k) => s.classList.toggle("on", k === i));
  shots.forEach((s, k) => s.classList.toggle("on", k === i));
}
const tourST = ScrollTrigger.create({
  trigger: "#tour", start: "top top", end: () => `+=${innerHeight * 4}`, pin: ".tour-inner", pinSpacing: true,
  onUpdate: (self) => setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))),
});
steps.forEach((li, i) => li.addEventListener("click", () => {
  const y = tourST.start + (tourST.end - tourST.start) * ((i + 0.5) / steps.length);
  if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else scrollTo(0, y);
}));

// ---------- collector check card cycles through ratings ----------
const rates = $$<HTMLElement>(".rates button");
const MSG = { clean: "Clean pickup · +40 pts · streak continues", minor: "Minor contamination · +25 pts · tip sent to the resident", major: "Major contamination · 0 pts · streak resets" };
let ri = 0;
setInterval(() => {
  ri = (ri + 1) % rates.length;
  rates.forEach((b, k) => b.classList.toggle("on", k === ri));
  $("#checkMsg").textContent = MSG[rates[ri].dataset.r as keyof typeof MSG];
}, 2200);

// ---------- leaderboard bars + counters ----------
$$<HTMLElement>(".board .bar").forEach((bar, i) => {
  const fill = $<HTMLElement>("i", bar);
  const w = `${bar.dataset.w}%`;
  if (reduce) { fill.style.width = w; return; }
  gsap.to(fill, { width: w, duration: 1.4, delay: i * 0.12, ease: "power3.out", scrollTrigger: { trigger: bar, start: "top 90%" } });
});
$$<HTMLElement>("[data-count]").forEach((el) => {
  const end = parseFloat(el.dataset.count!), dec = parseInt(el.dataset.dec || "0", 10);
  if (reduce) { el.textContent = end.toFixed(dec); return; }
  const o = { v: 0 };
  gsap.to(o, { v: end, duration: 2, ease: "power2.out", onUpdate: () => { el.textContent = o.v.toFixed(dec); }, scrollTrigger: { trigger: el, start: "top 90%" } });
});

// ---------- go ----------
measure();
addEventListener("load", () => { measure(); ScrollTrigger.refresh(); });
ScrollTrigger.addEventListener("refresh", measure);
document.fonts?.ready.then(() => { measure(); ScrollTrigger.refresh(); });
requestAnimationFrame(() => setTimeout(() => $("#loader").classList.add("done"), 400));

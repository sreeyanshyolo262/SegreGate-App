import { useEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// The same spring curves the stylesheet uses, for animations started from script.
export const spring = (name: "soft" | "snappy" | "bouncy") =>
  getComputedStyle(document.documentElement).getPropertyValue(`--spring-${name}`).trim() || "ease-out";

export const canMorph = () => "startViewTransition" in document && !prefersReducedMotion();

// Lets the browser glide between two states of the page, carrying shared elements across.
export function morph(update: () => void, rootClass?: string) {
  if (!canMorph()) return update();
  const html = document.documentElement;
  if (rootClass) html.classList.add(rootClass);
  const t = document.startViewTransition(() => flushSync(update));
  t.ready.catch(() => {});
  t.finished.finally(() => { if (rootClass) html.classList.remove(rootClass); });
}

// A very light tap on phones that support it. Does nothing on iPhones, where websites can't use the vibration motor.
export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* not available */ }
}

// Tells you when an element enters or leaves the screen, without redrawing anything.
export function useOnScreen(ref: RefObject<Element | null>, onChange: (visible: boolean) => void) {
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => latest.current(e.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
}

// Sections glide in the first time they scroll into view.
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    document.querySelectorAll(".page .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Weak phones keep the app responsive by dropping glass effects and idle movement.
export function tuneForDevice() {
  const html = document.documentElement;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if ((nav.deviceMemory && nav.deviceMemory <= 2) || nav.hardwareConcurrency <= 2 || nav.connection?.saveData) html.classList.add("lite");

  // Also judged by how the first couple of seconds actually run.
  let last = performance.now(), frames = 0, slow = 0;
  const tick = (t: number) => {
    if (t - last > 40) slow++;
    last = t;
    if (++frames < 120) requestAnimationFrame(tick);
    else if (slow > frames * 0.35) html.classList.add("lite");
  };
  requestAnimationFrame(tick);
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));
const shiftLayers = (layers: HTMLElement[], x: number, y: number) => {
  for (const l of layers) {
    const depth = Number(l.dataset.depth);
    l.style.transition = "";
    l.style.transform = `translate3d(${(x * depth).toFixed(2)}px, ${(y * depth).toFixed(2)}px, 0)`;
  }
};

// Cards lean towards your finger or cursor and catch the light, like the app icons on an Apple TV.
export function startTilt() {
  if (prefersReducedMotion()) return;
  const html = document.documentElement;
  let card: HTMLElement | null = null, box: DOMRect | null = null, layers: HTMLElement[] = [], x = 0, y = 0, queued = false, pressing = 0;

  const letGo = () => {
    clearTimeout(pressing);
    if (!card) return;
    card.classList.remove("tilting");
    card.style.transition = "";
    card.style.transform = "";
    for (const l of layers) { l.style.transition = "transform .7s var(--spring-soft)"; l.style.transform = ""; }
    card = null;
  };
  const draw = () => {
    queued = false;
    if (!card || !box) return;
    const nx = clamp(((x - box.left) / box.width) * 2 - 1), ny = clamp(((y - box.top) / box.height) * 2 - 1);
    card.style.transform = `perspective(760px) rotateX(${(-ny * 5).toFixed(2)}deg) rotateY(${(nx * 6).toFixed(2)}deg) scale(.992)`;
    card.style.setProperty("--gx", `${((nx + 1) * 50).toFixed(1)}%`);
    card.style.setProperty("--gy", `${((ny + 1) * 50).toFixed(1)}%`);
    shiftLayers(layers, nx, ny);
  };
  const aim = (e: PointerEvent) => {
    x = e.clientX; y = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  };
  const cardUnder = (e: PointerEvent) => {
    const t = e.target as Element | null;
    if (!t?.closest || t.closest("input, textarea, [data-notilt]") || html.classList.contains("lite")) return null;
    return t.closest<HTMLElement>(".tilt");
  };
  const begin = (e: PointerEvent, el: HTMLElement) => {
    letGo();
    card = el;
    box = el.getBoundingClientRect();
    layers = [...el.querySelectorAll<HTMLElement>("[data-depth]")];
    el.classList.add("tilting");
    el.style.transition = "transform .12s ease-out, box-shadow .2s ease";
    aim(e);
  };

  document.addEventListener("pointerdown", (e) => {
    const el = cardUnder(e);
    if (!el) return;
    // A finger that's about to scroll shouldn't make the card lurch, so wait a moment to see that it's really a press.
    if (e.pointerType === "mouse") begin(e, el);
    else { clearTimeout(pressing); pressing = window.setTimeout(() => begin(e, el), 80); }
  }, { passive: true });
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !e.buttons) {
      const el = cardUnder(e);
      if (el !== card) { if (el) begin(e, el); else letGo(); return; }
    }
    if (card) aim(e);
  }, { passive: true });
  const lift = (e: Event) => { if ((e as PointerEvent).pointerType !== "mouse") letGo(); };
  document.addEventListener("pointerup", lift, { passive: true });
  document.addEventListener("pointercancel", lift, { passive: true });
  addEventListener("scroll", letGo, { passive: true });
}

// On phones that share it, tilting the phone shifts a card's layers, so it has real depth. iPhones would ask permission first, which isn't worth it for a flourish.
export function useDeviceDepth(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion() || typeof DeviceOrientationEvent === "undefined" || "requestPermission" in DeviceOrientationEvent) return;
    const layers = [...root.querySelectorAll<HTMLElement>("[data-depth]")];
    let rest: number | null = null, x = 0, y = 0, toX = 0, toY = 0, raf = 0, visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(root);
    const step = () => {
      x += (toX - x) * 0.12;
      y += (toY - y) * 0.12;
      shiftLayers(layers, x, y);
      raf = Math.abs(toX - x) + Math.abs(toY - y) > 0.004 ? requestAnimationFrame(step) : 0;
    };
    const read = (e: DeviceOrientationEvent) => {
      if (!visible || e.gamma === null || e.beta === null) return;
      if (document.documentElement.dataset.sheet || document.documentElement.classList.contains("lite") || root.classList.contains("tilting")) return;
      rest ??= e.beta;
      toX = clamp(e.gamma / 22);
      toY = clamp((e.beta - rest) / 22);
      if (!raf) raf = requestAnimationFrame(step);
    };
    addEventListener("deviceorientation", read, { passive: true });
    return () => { removeEventListener("deviceorientation", read); cancelAnimationFrame(raf); io.disconnect(); };
  }, [ref]);
}

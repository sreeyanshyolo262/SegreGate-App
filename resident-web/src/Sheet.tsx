import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { haptic, prefersReducedMotion } from "./motion";

export type Entrance = "slide" | "swap" | "none";

export const SheetStage = createContext<{ leaving: boolean; entrance: Entrance; animateExit: boolean; onGone: () => void; onDragClose: () => void }>({
  leaving: false, entrance: "slide", animateExit: true, onGone: () => {}, onDragClose: () => {},
});

const setStatusBar = (color: string) => document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);

interface Props {
  label: string;
  onClose: () => void;
  small?: boolean;
  dark?: boolean;
  keyboard?: boolean;
  className?: string;
  children: ReactNode;
}

// Every full-screen view: slides up over the page, steps the page back, and can be dragged down to dismiss.
export default function Sheet({ label, onClose, small = false, dark = false, keyboard = false, className = "", children }: Props) {
  const { leaving, entrance, animateExit, onGone, onDragClose } = useContext(SheetStage);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, []);

  // Step the page back behind the sheet.
  useLayoutEffect(() => {
    if (small) return;
    const html = document.documentElement;
    const back = () => { delete html.dataset.sheet; setStatusBar("#fffbea"); };
    if (leaving) { back(); return; }
    document.querySelector<HTMLElement>(".page")?.style.setProperty("--page-y", `${window.scrollY}px`);
    html.dataset.sheet = "open";
    setStatusBar("#0b1f19");
    return back;
  }, [small, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const el = panel.current;
    if (!el || !animateExit || prefersReducedMotion()) { onGone(); return; }
    const t = setTimeout(onGone, 450);
    const done = (e: AnimationEvent) => { if (e.target === el) onGone(); };
    el.addEventListener("animationend", done);
    return () => { clearTimeout(t); el.removeEventListener("animationend", done); };
  }, [leaving, animateExit, onGone]);

  // On phones the keyboard covers the page, so the sheet is sized to the part of the screen still visible.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = wrap.current;
    if (!keyboard || !vv || !el) return;
    const update = () => { el.style.height = `${vv.height}px`; el.style.transform = `translateY(${vv.offsetTop}px)`; };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [keyboard]);

  // Drag down from the header, or from the top of the content, to dismiss. The sheet follows the finger.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const html = document.documentElement;
    const page = document.querySelector<HTMLElement>(".page");
    const backdrop = document.querySelector<HTMLElement>(".sheet-backdrop");
    let state: "idle" | "maybe" | "drag" = "idle";
    let startX = 0, startY = 0, y = 0, lastY = 0, lastT = 0, speed = 0, height = 1;

    const start = (e: TouchEvent) => {
      state = "idle";
      if (e.touches.length !== 1) return;
      const target = e.target as Element;
      if (target.closest("input, textarea, select, [data-nodrag]")) return;
      const area = target.closest("[data-sheet-scroll]");
      if (!target.closest("[data-sheet-handle]") && (!area || area.scrollTop > 0)) return;
      state = "maybe";
      startX = e.touches[0].clientX; startY = lastY = e.touches[0].clientY; lastT = e.timeStamp; speed = 0; y = 0;
    };
    const move = (e: TouchEvent) => {
      if (state === "idle") return;
      const { clientX, clientY } = e.touches[0];
      const dx = clientX - startX, dy = clientY - startY;
      if (state === "maybe") {
        if (Math.hypot(dx, dy) < 6) return;
        if (dy <= 0 || Math.abs(dx) > dy) { state = "idle"; return; }
        state = "drag";
        height = el.offsetHeight;
        html.dataset.sheetDrag = "";
        el.style.transition = "none";
      }
      if (e.cancelable) e.preventDefault();
      y = Math.max(0, dy);
      speed = (clientY - lastY) / Math.max(1, e.timeStamp - lastT);
      lastY = clientY; lastT = e.timeStamp;
      el.style.transform = `translateY(${y}px)`;
      if (!small) {
        const done = Math.min(1, y / height);
        if (page) page.style.transform = `scale(${0.93 + 0.07 * done})`;
        if (backdrop) backdrop.style.opacity = String(1 - done);
      }
    };
    const end = () => {
      if (state !== "drag") { state = "idle"; return; }
      state = "idle";
      delete html.dataset.sheetDrag;
      page?.style.removeProperty("transform");
      backdrop?.style.removeProperty("opacity");
      el.style.transition = "";
      if (y > height * 0.28 || speed > 0.55) {
        haptic();
        if (!small) { delete html.dataset.sheet; setStatusBar("#fffbea"); }
        el.classList.add("sheet-leaving");
        onDragClose();
        close.current();
      } else {
        el.style.transform = "";
      }
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      delete html.dataset.sheetDrag;
    };
  }, [small, onDragClose]);

  const motion = leaving ? "sheet-leaving" : entrance === "slide" ? "sheet-enter" : entrance === "swap" ? "sheet-swap" : "";

  return (
    <div ref={wrap} className="fixed inset-x-0 top-0 z-50 h-full" role="dialog" aria-label={label} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {small && <div className={`sheet-scrim ${leaving ? "out" : ""}`} onClick={onClose} />}
      <div ref={panel} className={`sheet-panel ${small ? "sheet-small" : ""} ${dark ? "sheet-dark" : ""} ${motion} ${className}`}>
        <span className="sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

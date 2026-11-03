import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, BookOpen, ChevronDown, CircleHelp, Leaf, LifeBuoy, PackageOpen, Search, Sprout, Trash2, Truck, X, type LucideIcon } from "lucide-react";
import type { Faq } from "./api";
import Linkified from "./Linkified";
import Sheet from "./Sheet";
import { prefersReducedMotion, spring } from "./motion";

const TOPICS: { id: string; label?: string; tone: string; icon: LucideIcon }[] = [
  { id: "Rules", label: "The basics", tone: "bg-sky", icon: BookOpen },
  { id: "Bins & liners", tone: "bg-mint", icon: Trash2 },
  { id: "Special cases", tone: "bg-peach", icon: PackageOpen },
  { id: "Collection", tone: "bg-butter", icon: Truck },
  { id: "Help", tone: "bg-blush", icon: LifeBuoy },
  { id: "Why it matters", tone: "bg-moss text-white", icon: Leaf },
];
const FALLBACK = { tone: "bg-white", icon: CircleHelp };
const styleOf = (topic: string) => TOPICS.find((t) => t.id === topic) ?? FALLBACK;
const labelOf = (topic: string) => TOPICS.find((t) => t.id === topic)?.label ?? topic;

const termsOf = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi");
  return <>{text.split(re).map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-white px-0.5 text-ink">{p}</mark> : <span key={i}>{p}</span>))}</>;
}

// Answers are plain text: each line is a paragraph, and lines starting with a bullet become a list.
function AnswerBody({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={blocks.length} className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5"><span className="mt-[9px] h-2 w-2 shrink-0 rounded-full border-[1.5px] border-ink bg-butter" /><span className="min-w-0"><Linkified text={b} pill /></span></li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^[•\-–]\s+(.*)$/);
    if (m) { bullets.push(m[1]); continue; }
    flush();
    blocks.push(<p key={blocks.length}><Linkified text={line} pill /></p>);
  }
  flush();
  return <div className="space-y-2.5">{blocks}</div>;
}

// Keeps the tapped card under the finger while others open and close, then shows as much of its answer as fits.
function holdInPlace(card: HTMLElement, box: HTMLElement, bar: HTMLElement) {
  if (prefersReducedMotion()) return;
  const above = [...box.querySelectorAll("article:has([aria-expanded=true])")].some((a) => a !== card && a.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING);
  const top = card.getBoundingClientRect().top;
  const end = performance.now() + 440;
  let stopped = false;
  const stop = () => { stopped = true; };
  box.addEventListener("touchstart", stop, { once: true, passive: true });
  const step = () => {
    if (stopped) return;
    if (above) {
      const drift = card.getBoundingClientRect().top - top;
      if (Math.abs(drift) > 0.5) box.scrollTop += drift;
    }
    if (performance.now() < end) { requestAnimationFrame(step); return; }
    box.removeEventListener("touchstart", stop);
    const r = card.getBoundingClientRect(), roof = bar.getBoundingClientRect().bottom + 8, floor = box.getBoundingClientRect().bottom - 16;
    if (r.top < roof) box.scrollBy({ top: r.top - roof, behavior: "smooth" });
    else if (r.bottom > floor) box.scrollBy({ top: Math.min(r.bottom - floor, r.top - roof), behavior: "smooth" });
  };
  requestAnimationFrame(step);
}

const FaqItem = memo(function FaqItem({ faq, open, onToggle, terms, delay }: { faq: Faq; open: boolean; onToggle: (id: string, card: HTMLElement) => void; terms: string[]; delay: number | null }) {
  const { tone, icon: Icon } = styleOf(faq.topic);
  const panel = `faq-panel-${faq.id}`;
  const opened = useRef(false);
  if (open) opened.current = true;
  // Decided once, so a card doesn't replay its entrance when a search moves it up the list.
  const entrance = useRef(delay);

  return (
    <article data-id={faq.id} className={`card overflow-hidden ${tone} ${entrance.current === null ? "" : "rise"}`} style={entrance.current === null ? undefined : { animationDelay: `${entrance.current}ms` }}>
      <h3>
        <button onClick={(e) => onToggle(faq.id, e.currentTarget.closest("article")!)} aria-expanded={open} aria-controls={panel} className="flex w-full items-start gap-3 p-3.5 text-left active:scale-[.985]">
          <span className={`flip-badge grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white text-ink ${open ? "is-open" : ""}`}><Icon size={19} /></span>
          <span className="min-w-0 flex-1 self-center font-display text-base font-bold leading-snug"><Highlight text={faq.question} terms={terms} /></span>
          <span className={`chev mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-white text-ink ${open ? "rotate-180" : ""}`}><ChevronDown size={17} /></span>
        </button>
      </h3>
      <div id={panel} className={`fold ${open ? "open" : ""}`}>
        <div>
          <div className="fold-body mx-3 mb-3 rounded-2xl bg-white p-3.5 text-[15px] leading-relaxed text-ink">{opened.current && <AnswerBody text={faq.answer} />}</div>
        </div>
      </div>
    </article>
  );
});

// The selected topic's pill slides across to the new one.
function TopicBar({ topics, topic, onPick }: { topics: { id: string; tone: string }[]; topic: string; onPick: (id: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  const place = useCallback((animate: boolean) => {
    const box = row.current, p = pill.current;
    const on = box?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (!box || !p || !on) return;
    if (!animate) p.style.transition = "none";
    p.style.width = `${on.offsetWidth}px`;
    p.style.transform = `translateX(${on.offsetLeft}px)`;
    if (!animate) { void p.offsetWidth; p.style.transition = ""; }
  }, []);
  useLayoutEffect(() => { place(placed.current); placed.current = true; }, [place, topic, topics.length]);
  useEffect(() => { document.fonts?.ready.then(() => place(false)); }, [place]);

  function pick(id: string, el: HTMLElement) {
    onPick(id);
    const box = row.current;
    box?.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  return (
    <div ref={row} className="scroll-hide chips relative flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pr-8">
      <span ref={pill} aria-hidden="true" className="absolute left-0 top-1 z-[1] h-9 rounded-full bg-ink" style={{ transition: "transform .55s var(--spring-snappy), width .55s var(--spring-snappy)" }} />
      {topics.map((t) => (
        <button key={t.id} onClick={(e) => pick(t.id, e.currentTarget)} aria-pressed={topic === t.id}
          className={`relative h-9 shrink-0 whitespace-nowrap rounded-full border-2 border-ink px-3.5 text-sm font-bold active:scale-95 ${topic === t.id ? "z-[2] bg-transparent text-butter" : t.tone}`}>{labelOf(t.id)}</button>
      ))}
    </div>
  );
}

interface Props {
  faqs: Faq[] | null;
  failed: boolean;
  onRetry: () => void;
  onClose: () => void;
  onAsk: (question?: string) => void;
}

export default function FaqSheet({ faqs, failed, onRetry, onClose, onAsk }: Props) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, number> | null>(null);

  // Typing stays instant: the list catches up a moment later, when there's time.
  const search = useDeferredValue(query);
  const terms = useMemo(() => termsOf(search), [search]);
  const present = useMemo(() => TOPICS.filter((t) => faqs?.some((f) => f.topic === t.id)), [faqs]);
  const shown = useMemo(() => (faqs ?? []).filter((f) => {
    if (topic !== "All" && f.topic !== topic) return false;
    const hay = `${f.question} ${f.answer} ${f.topic}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  }), [faqs, topic, terms]);
  const groups = useMemo(() => {
    const known = present.map((t) => t.id);
    const ids = [...known, ...new Set(shown.map((f) => f.topic).filter((t) => !known.includes(t)))];
    return ids.map((id) => ({ id, items: shown.filter((f) => f.topic === id) })).filter((g) => g.items.length);
  }, [present, shown]);

  // When the list changes, the cards that stay glide to their new places.
  const remember = () => {
    const box = scroller.current;
    if (!box || !list.current || prefersReducedMotion()) return;
    const at = new Map<string, number>();
    list.current.querySelectorAll<HTMLElement>("article[data-id]").forEach((el) => at.set(el.dataset.id!, el.getBoundingClientRect().top + box.scrollTop));
    before.current = at;
  };
  useLayoutEffect(() => {
    const was = before.current, box = scroller.current;
    if (!was || !box || !list.current) return;
    before.current = null;
    const easing = spring("snappy"), height = window.innerHeight;
    list.current.querySelectorAll<HTMLElement>("article[data-id]").forEach((el) => {
      const from = was.get(el.dataset.id!);
      if (from === undefined) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > height + 100) return;
      const dy = Math.max(-420, Math.min(420, from - (r.top + box.scrollTop)));
      if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 520, easing });
    });
  }, [topic, search]);

  const onToggle = useCallback((id: string, card: HTMLElement) => {
    setOpenId((cur) => (cur === id ? null : id));
    if (scroller.current && bar.current) holdInPlace(card, scroller.current, bar.current);
  }, []);

  function pickTopic(id: string) {
    remember();
    setTopic(id);
    // If the header has scrolled away, go back to the top of the list, not the top of the page.
    const s = scroller.current, b = bar.current;
    if (s && b && s.scrollTop > b.offsetTop) s.scrollTop = b.offsetTop;
  }

  let index = 0;

  return (
    <Sheet label="Frequently asked questions" onClose={onClose}>
      <div ref={scroller} data-sheet-scroll className="h-full overflow-y-auto overscroll-contain">
        <div data-sheet-handle className="relative overflow-hidden rounded-b-[30px] bg-moss px-5 pb-5 pt-8 text-white">
          <span className="float-a absolute -right-8 -top-8 h-32 w-32 rounded-full bg-butter/30" />
          <span className="float-b absolute right-5 top-[68px] h-9 w-9 rounded-full bg-peach/50" />
          <span className="float-c absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-leaf/70" />
          <div className="relative">
            <h1 className="font-display text-[34px] font-extrabold leading-none">Got a question?</h1>
            <p className="mt-2 text-sm opacity-85">{faqs ? `${faqs.length} quick answers, all in one place` : "Quick answers, all in one place"}</p>
            <label className="mt-4 flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-white px-3.5 text-ink shadow-[0_4px_0_#0a2a20]">
              <Search size={18} className="shrink-0 opacity-50" />
              <input value={query} onChange={(e) => { remember(); setQuery(e.target.value); }} placeholder="Search FAQs, like liners" aria-label="Search FAQs"
                className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:opacity-45" />
              {query && <button onClick={() => { remember(); setQuery(""); }} aria-label="Clear search" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/10"><X size={15} /></button>}
            </label>
          </div>
        </div>

        <div ref={bar} data-sheet-handle className="material sticky top-0 z-10 flex items-center gap-2 pb-2.5 pl-4 pt-2.5">
          <button onClick={onClose} aria-label="Back" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink text-butter"><ArrowLeft size={19} /></button>
          <TopicBar topics={[{ id: "All", tone: "bg-white" }, ...present]} topic={topic} onPick={pickTopic} />
        </div>

        <div ref={list} className="space-y-6 px-4 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-2">
          {faqs === null && !failed && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton card-soft h-[72px]" />)}</div>}
          {faqs === null && failed && (
            <div className="card bg-blush p-4 text-sm"><p className="font-bold">Couldn't load the FAQs</p>
              <button onClick={onRetry} className="mt-1 font-bold underline">Try again</button></div>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              {topic === "All" && <h2 className="mb-2.5 ml-1 font-display text-lg font-extrabold">{labelOf(g.id)}</h2>}
              <div className="space-y-3">
                {g.items.map((f) => (
                  <FaqItem key={f.id} faq={f} terms={terms} open={openId === f.id} delay={index < 8 ? index++ * 40 : null} onToggle={onToggle} />
                ))}
              </div>
            </section>
          ))}

          {faqs !== null && shown.length === 0 && (
            <div className="card-in rounded-[22px] border-2 border-dashed border-ink/30 p-5 text-center">
              <p className="font-display text-lg font-extrabold">Nothing here yet</p>
              <p className="mt-1 text-sm opacity-70">{query ? `No FAQ mentions "${query}".` : "No FAQs in this topic."}</p>
              {query && <button onClick={() => onAsk(query)} className="press card mt-3 bg-butter px-4 py-2 text-sm font-bold">Ask Bin-Buddy instead</button>}
            </div>
          )}

          {faqs !== null && (
            <button onClick={() => onAsk()} className="press card flex w-full items-center gap-3 bg-butter p-3.5 text-left">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-white"><Sprout size={21} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-extrabold leading-tight">Still not sure?</span>
                <span className="block text-[13px] opacity-75">Ask Bin-Buddy what goes where</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

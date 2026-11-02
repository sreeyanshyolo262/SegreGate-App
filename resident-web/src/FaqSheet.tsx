import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, CircleHelp, Leaf, LifeBuoy, PackageOpen, Scale, Search, Sprout, Trash2, Truck, X, type LucideIcon } from "lucide-react";
import type { Faq } from "./api";
import Linkified from "./Linkified";

const TOPICS: { id: string; tone: string; icon: LucideIcon }[] = [
  { id: "Rules", tone: "bg-sky", icon: Scale },
  { id: "Bins & liners", tone: "bg-mint", icon: Trash2 },
  { id: "Special cases", tone: "bg-peach", icon: PackageOpen },
  { id: "Collection", tone: "bg-butter", icon: Truck },
  { id: "Help", tone: "bg-blush", icon: LifeBuoy },
  { id: "Why it matters", tone: "bg-moss text-white", icon: Leaf },
];
const FALLBACK = { tone: "bg-white", icon: CircleHelp };
const styleOf = (topic: string) => TOPICS.find((t) => t.id === topic) ?? FALLBACK;

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

function FaqItem({ faq, open, onToggle, terms, delay }: { faq: Faq; open: boolean; onToggle: () => void; terms: string[]; delay: number }) {
  const { tone, icon: Icon } = styleOf(faq.topic);
  const panel = `faq-panel-${faq.id}`;
  const ref = useRef<HTMLElement>(null);

  // After the card above collapses, keep the card that just opened on screen.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 320);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <article ref={ref} className={`card rise scroll-mt-20 scroll-mb-4 overflow-hidden ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <h3>
        <button onClick={onToggle} aria-expanded={open} aria-controls={panel} className="flex w-full items-start gap-3 p-3.5 text-left transition-transform active:scale-[.985]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white text-ink"><Icon size={19} /></span>
          <span className="min-w-0 flex-1 self-center font-display text-base font-bold leading-snug"><Highlight text={faq.question} terms={terms} /></span>
          <span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-white text-ink transition-transform duration-300 ${open ? "rotate-180" : ""}`}><ChevronDown size={17} /></span>
        </button>
      </h3>
      <div id={panel} className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out ${open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="mx-3 mb-3 rounded-2xl bg-white p-3.5 text-[15px] leading-relaxed text-ink"><AnswerBody text={faq.answer} /></div>
        </div>
      </div>
    </article>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const terms = useMemo(() => termsOf(query), [query]);
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

  function pickTopic(id: string, el: HTMLElement) {
    setTopic(id);
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    // If the header has scrolled away, go back to the top of the list, not the top of the page.
    const s = scroller.current, b = bar.current;
    if (s && b && s.scrollTop > b.offsetTop) s.scrollTop = b.offsetTop;
  }

  let index = 0;

  return (
    <div className="sheet-up fixed inset-0 z-50 bg-cream" role="dialog" aria-label="Frequently asked questions">
      <div ref={scroller} className="mx-auto h-full max-w-[480px] overflow-y-auto overscroll-contain">
        <div className="relative overflow-hidden rounded-b-[30px] bg-moss px-5 pb-5 pt-[calc(env(safe-area-inset-top)+22px)] text-white">
          <span className="float-a absolute -right-8 -top-8 h-32 w-32 rounded-full bg-butter/30" />
          <span className="float-b absolute right-5 top-[68px] h-9 w-9 rounded-full bg-peach/50" />
          <span className="float-c absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-leaf/70" />
          <div className="relative">
            <h1 className="font-display text-[34px] font-extrabold leading-none">Got a question?</h1>
            <p className="mt-2 text-sm opacity-85">{faqs ? `${faqs.length} answers from your committee` : "Answers from your committee"}</p>
            <label className="mt-4 flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-white px-3.5 text-ink shadow-[0_4px_0_#0a2a20]">
              <Search size={18} className="shrink-0 opacity-50" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search FAQs, like liners" aria-label="Search FAQs"
                className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:opacity-45" />
              {query && <button onClick={() => setQuery("")} aria-label="Clear search" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/10"><X size={15} /></button>}
            </label>
          </div>
        </div>

        <div ref={bar} className="sticky top-0 z-10 flex items-center gap-2 bg-cream pb-2.5 pl-4 pt-[max(10px,env(safe-area-inset-top))]">
          <button onClick={onClose} aria-label="Back" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink text-butter"><ArrowLeft size={19} /></button>
          <div className="scroll-hide flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pr-4">
            {[{ id: "All", tone: "bg-white" }, ...present].map((t) => (
              <button key={t.id} onClick={(e) => pickTopic(t.id, e.currentTarget)} aria-pressed={topic === t.id}
                className={`h-9 shrink-0 whitespace-nowrap rounded-full border-2 border-ink px-3.5 text-sm font-bold transition-transform active:scale-95 ${topic === t.id ? "bg-ink text-butter" : t.tone}`}>{t.id}</button>
            ))}
          </div>
        </div>

        <div key={topic} className="space-y-6 px-4 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-2">
          {faqs === null && !failed && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton card h-[72px]" />)}</div>}
          {faqs === null && failed && (
            <div className="card bg-blush p-4 text-sm"><p className="font-bold">Couldn't load the FAQs</p>
              <button onClick={onRetry} className="mt-1 font-bold underline">Try again</button></div>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              {topic === "All" && <h2 className="mb-2.5 ml-1 font-display text-lg font-extrabold">{g.id}</h2>}
              <div className="space-y-3">
                {g.items.map((f) => (
                  <FaqItem key={f.id} faq={f} terms={terms} open={openId === f.id} delay={Math.min(index++, 8) * 40}
                    onToggle={() => setOpenId((cur) => (cur === f.id ? null : f.id))} />
                ))}
              </div>
            </section>
          ))}

          {faqs !== null && shown.length === 0 && (
            <div className="rise rounded-[22px] border-2 border-dashed border-ink/30 p-5 text-center">
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
    </div>
  );
}

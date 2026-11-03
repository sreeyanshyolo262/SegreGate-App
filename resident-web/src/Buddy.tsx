import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowLeft, BookOpen, Send } from "lucide-react";
import { api, type AnswerData, type Session, type Source } from "./api";
import AnswerCard from "./AnswerCard";
import { BinWave } from "./Bins";
import { Mascot } from "./Mascot";
import Sheet from "./Sheet";
import { AiRing } from "./ui";
import { haptic, prefersReducedMotion, useDeviceDepth, useOnScreen } from "./motion";

export const SUGGESTIONS = ["Pizza box", "Used tissue", "Old batteries", "Milk packet", "Eggshells", "Broken glass"];
const THINKING = ["Reading Ajmera's guidelines", "Looking through the FAQs", "Finding the right bin"];
const HINTS = ["What are you throwing away?", "Try “pizza box”", "Try “old batteries”", "Try “used tissue”", "Try “eggshells”"];
const MATERIALS = ["Plastic", "Paper or card", "Metal", "Glass", "Cloth", "Food or plant"];
const MADE_OF = ", made of ";

export type BuddyMsg =
  | { id: number; from: "me"; text: string }
  | { id: number; from: "bot"; question: string; status: "ok"; card: AnswerData | null; text: string | null; source: Source | null; related: { id: string; question: string }[] }
  | { id: number; from: "bot"; question: string; status: "none" | "busy" | "error"; message?: string; isItem?: boolean; related: { id: string; question: string }[] };

// The conversation lives above the sheet, so it's still there if a resident goes back and returns.
export function useBuddy(session: Session) {
  const [msgs, setMsgs] = useState<BuddyMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const nextId = useRef(1);

  const ask = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q || pending.current) return;
    pending.current = true;
    setMsgs((m) => [...m, { id: nextId.current++, from: "me", text: q }]);
    setBusy(true);
    let reply: BuddyMsg;
    try {
      const r = await api.ask(q, session);
      const base = { id: nextId.current++, from: "bot" as const, question: q, related: (r.related ?? []).slice(0, 2) };
      if (r.unavailable) reply = { ...base, status: "busy" };
      else if (r.card || r.answer) reply = { ...base, status: "ok", card: r.card ?? null, text: r.answer, source: r.source };
      else reply = { ...base, status: "none", isItem: r.isItem };
      if (reply.status === "ok") haptic(10);
    } catch (e) {
      reply = { id: nextId.current++, from: "bot", question: q, status: "error", message: (e as Error).message, related: [] };
    }
    setMsgs((m) => [...m, reply]);
    setBusy(false);
    pending.current = false;
  }, [session]);

  return { msgs, busy, ask };
}

function ThinkingBubble({ question }: { question?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % THINKING.length), 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rise space-y-3 rounded-[22px] border-2 border-ink/10 bg-white p-3.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="shrink-0"><Mascot size={40} mood="thinking" /></span>
        <div className="min-w-0 flex-1">
          {question && <p className="truncate text-xs font-bold opacity-50">Looking up “{question}”</p>}
          <p key={i} className="hint text-[15px] font-medium">{THINKING[i]}…</p>
        </div>
      </div>
      <BinWave />
    </div>
  );
}

function Chips({ onPick, disabled }: { onPick: (q: string) => void; disabled?: boolean }) {
  return (
    <div className="scroll-hide chips -mx-4 flex gap-2 overflow-x-auto px-4 py-1 pr-8">
      {SUGGESTIONS.map((s) => (
        <button key={s} disabled={disabled} onClick={() => onPick(s)} className="shrink-0 rounded-full border-2 border-ink bg-butter px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:opacity-50">{s}</button>
      ))}
    </div>
  );
}

function Quiet({ title, children, tone = "bg-peach" }: { title: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className={`card-in rounded-[22px] border-2 border-ink/15 p-4 ${tone}`}>
      <p className="font-display text-lg font-extrabold leading-tight">{title}</p>
      <div className="mt-1.5 text-[15px] leading-snug">{children}</div>
    </div>
  );
}

// The resident's own words arc across the screen and drop into the right bin, just as its lid lifts.
function flyIntoBin(from: Element, to: Element) {
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (b.top > window.innerHeight || b.bottom < 0) return;
  const chip = from.cloneNode(true) as HTMLElement;
  chip.classList.remove("bubble-in");
  Object.assign(chip.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, maxWidth: "none", margin: "0", zIndex: "70", pointerEvents: "none" });
  document.body.append(chip);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + 12 - (a.top + a.height / 2);
  const flight = chip.animate([
    { transform: "none" },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.3 - 34}px) scale(.72) rotate(7deg)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.16) rotate(16deg)`, opacity: 0.95, offset: 0.95 },
    { transform: `translate(${dx}px, ${dy}px) scale(.1) rotate(16deg)`, opacity: 0 },
  ], { duration: 700, easing: "cubic-bezier(.45, 0, .55, 1)", fill: "forwards" });
  flight.onfinish = () => chip.remove();
}

// If Bin-Buddy doesn't recognise an item, knowing what it's made of is usually enough to place it.
function MadeOf({ question, busy, onSend }: { question: string; busy: boolean; onSend: (q: string) => void }) {
  return (
    <div className="mb-3">
      <p className="font-bold">What's it mostly made of?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MATERIALS.map((m, i) => (
          <button key={m} disabled={busy} onClick={() => onSend(`${question}${MADE_OF}${m.toLowerCase()}`)} style={{ "--i": i } as CSSProperties} className="pop-item rounded-full border-2 border-ink bg-white px-3 py-1 text-[13px] font-bold active:scale-95 disabled:opacity-50">{m}</button>
        ))}
      </div>
    </div>
  );
}

// Kept apart from the chat box, so typing a letter doesn't redraw the whole conversation.
const Messages = memo(function Messages({ msgs, busy, onSend, onRetry, onOpenGuide, lastQuestion }: {
  msgs: BuddyMsg[];
  busy: boolean;
  onSend: (q: string) => void;
  onRetry: (q: string) => void;
  onOpenGuide: () => void;
  lastQuestion: RefObject<HTMLDivElement | null>;
}) {
  const lastMe = [...msgs].reverse().find((m) => m.from === "me");
  const lastMeId = lastMe?.id;
  const lastMsg = msgs[msgs.length - 1];
  // Only new answers fly in, not the old ones when the conversation is reopened.
  const flown = useRef(lastMsg?.id ?? 0);
  useEffect(() => {
    if (!lastMsg || lastMsg.id === flown.current) return;
    flown.current = lastMsg.id;
    if (lastMsg.from !== "bot" || lastMsg.status !== "ok" || lastMsg.card?.type !== "bin" || lastMsg.card.variants.length > 1 || prefersReducedMotion()) return;
    const t = setTimeout(() => {
      const bubble = lastQuestion.current?.firstElementChild;
      const bin = [...(lastQuestion.current?.parentElement?.querySelectorAll(".bin-on") ?? [])].pop();
      const settled = !document.querySelector(".sheet-panel")?.getAnimations().some((a) => a.playState === "running");
      if (bubble && bin && settled) flyIntoBin(bubble, bin);
    }, 260);
    return () => clearTimeout(t);
  }, [lastMsg, lastQuestion]);
  return (
    <>
      {msgs.length === 0 && (
        <div className="cascade pt-4 text-center">
          <div className="flex justify-center"><Mascot size={84} poke /></div>
          <p className="mt-3 font-display text-2xl font-extrabold leading-tight">What are you throwing away?</p>
          <p className="mx-auto mt-1.5 max-w-[300px] text-[15px] leading-snug opacity-70">No question is too small. Tell me the item and I'll help you find the right bin.</p>
          <div className="mt-4 text-left"><Chips onPick={onSend} /></div>
        </div>
      )}

      {msgs.map((m) => {
        if (m.from === "me") {
          return (
            <div key={m.id} ref={m.id === lastMeId ? lastQuestion : undefined} className="flex justify-end">
              <div className="bubble-in max-w-[85%] rounded-2xl rounded-br-md bg-moss px-4 py-2.5 text-[15px] leading-snug text-white [overflow-wrap:anywhere]">{m.text}</div>
            </div>
          );
        }
        return (
          <div key={m.id} className="space-y-2.5">
            {m.status === "ok" && (m.card
              ? <AnswerCard card={m.card} source={m.source} />
              : <Quiet title="Here's what I found" tone="bg-mint">{m.text}</Quiet>)}
            {m.status === "none" && (
              <Quiet title="I don't have an answer for that yet">
                {m.isItem && !m.question.includes(MADE_OF) && <MadeOf question={m.question} busy={busy} onSend={onSend} />}
                I've noted your question so it can be added. Your block's Sustainability Volunteer can help in the meantime, and the guide may cover it too.
                <button onClick={onOpenGuide} className="mt-3 flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold active:scale-95"><BookOpen size={15} /> See the segregation guide</button>
              </Quiet>
            )}
            {m.status === "busy" && (
              <Quiet title="I'm a little busy right now" tone="bg-butter">
                Please try again in a minute.
                <button disabled={busy} onClick={() => onRetry(m.question)} className="mt-3 block rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:opacity-50">Try again</button>
              </Quiet>
            )}
            {m.status === "error" && (
              <Quiet title="That didn't go through" tone="bg-butter">
                {m.message}
                <button disabled={busy} onClick={() => onRetry(m.question)} className="mt-3 block rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:opacity-50">Try again</button>
              </Quiet>
            )}
            {m.related.length > 0 && (
              <div className="rise" style={{ animationDelay: ".35s" }}>
                <p className="mb-1.5 ml-1 text-xs font-bold opacity-55">You could also ask</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.related.map((r) => (
                    <button key={r.id} disabled={busy} onClick={() => onSend(r.question)} className="rounded-2xl border-[1.5px] border-ink/30 bg-white px-3 py-1.5 text-left text-[13px] font-medium leading-tight active:scale-95 disabled:opacity-50">{r.question}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {busy && <ThinkingBubble question={lastMe?.from === "me" ? lastMe.text : undefined} />}
    </>
  );
});

function Composer({ busy, sent, input, onSend }: { busy: boolean; sent: number; input: RefObject<HTMLInputElement | null>; onSend: (q: string) => void }) {
  const [text, setText] = useState("");
  useEffect(() => setText(""), [sent]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSend(text); }} className="shrink-0 border-t-2 border-ink/10 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
      <AiRing on={busy} className="rounded-[20px]">
        <div className="flex items-center gap-2 rounded-[18px] bg-white p-1.5 pl-4">
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} enterKeyHint="send" aria-label="Ask Bin-Buddy" placeholder="What are you throwing away?"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:opacity-45" />
          <button disabled={busy || !text.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-leaf text-white active:scale-95 disabled:opacity-40"><Send key={sent} size={17} className={sent ? "plane-go" : ""} /></button>
        </div>
      </AiRing>
    </form>
  );
}

interface SheetProps {
  msgs: BuddyMsg[];
  busy: boolean;
  onAsk: (q: string) => void;
  onClose: () => void;
  onOpenGuide: () => void;
}

export default function BuddySheet({ msgs, busy, onAsk, onClose, onOpenGuide }: SheetProps) {
  const [sent, setSent] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const lastQuestion = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const busyNow = useRef(busy);
  busyNow.current = busy;
  const opened = useRef(false);

  const send = useCallback((q: string) => {
    if (!q.trim() || busyNow.current) return;
    setSent((n) => n + 1);
    input.current?.blur();
    onAsk(q);
  }, [onAsk]);

  // Bring the newest question to the top, so the answer can be read from its start.
  useEffect(() => {
    const box = scroller.current, el = lastQuestion.current;
    if (box && el) box.scrollTo({ top: el.offsetTop - 12, behavior: opened.current && !prefersReducedMotion() ? "smooth" : "auto" });
    opened.current = true;
  }, [msgs.length]);
  useEffect(() => { if (msgs.length === 0) input.current?.focus({ preventScroll: true }); }, [msgs.length]);

  const answers = msgs.filter((m) => m.from === "bot").length;

  return (
    <Sheet label="Bin-Buddy" onClose={onClose} keyboard className="flex flex-col">
      <header data-sheet-handle className="flex shrink-0 items-center gap-3 border-b-2 border-ink/10 px-4 pb-2.5 pt-[18px]">
        <button onClick={onClose} aria-label="Back" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink text-butter"><ArrowLeft size={19} /></button>
        <Mascot size={30} bump={answers} />
        <div className="min-w-0 leading-tight">
          <p className="font-display text-lg font-extrabold">Bin-Buddy</p>
          <p className="text-xs font-medium opacity-60">What goes where</p>
        </div>
      </header>

      <div ref={scroller} data-sheet-scroll className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        <Messages msgs={msgs} busy={busy} onSend={send} onRetry={onAsk} onOpenGuide={onOpenGuide} lastQuestion={lastQuestion} />
      </div>

      <Composer busy={busy} sent={sent} input={input} onSend={send} />
    </Sheet>
  );
}

// Example items take turns in the empty box, so residents can see the kind of thing to ask.
function RotatingHint({ running }: { running: boolean }) {
  const [i, setI] = useState(0);
  const el = useRef<HTMLSpanElement>(null);
  const onScreen = useRef(true);
  useOnScreen(el, (on) => { onScreen.current = on; });
  useEffect(() => {
    if (!running || prefersReducedMotion()) return;
    const t = setInterval(() => { if (!document.hidden && onScreen.current && !document.documentElement.dataset.sheet) setI((n) => (n + 1) % HINTS.length); }, 3400);
    return () => clearInterval(t);
  }, [running]);
  return <span ref={el} key={i} aria-hidden="true" className="hint pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center truncate text-base opacity-45">{HINTS[i]}</span>;
}

// The main feature of the home screen: a resident can ask straight away, without looking for it.
export function BuddyHero({ onAsk, count, busy, onResume, heroRef }: { onAsk: (q: string) => void; count: number; busy: boolean; onResume: () => void; heroRef: RefObject<HTMLElement | null> }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  useDeviceDepth(heroRef);
  return (
    <section ref={heroRef} className="tilt hero-card relative mt-5 overflow-hidden rounded-[26px] border-2 border-ink bg-moss p-4 pt-5 text-white shadow-[0_3px_0_#12332a]">
      <span data-depth="-9" className="absolute inset-0"><span className="float-a absolute -right-8 -top-10 h-36 w-36 rounded-full bg-leaf/70" /></span>
      <span data-depth="13" className="absolute inset-0"><span className="float-c absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-leaf/40" /></span>
      <span data-depth="20" className="absolute inset-0"><span className="float-b absolute left-[60%] top-[46px] h-4 w-4 rounded-full bg-butter/70" /></span>
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-butter">Bin-Buddy · What goes where</p>
          <h2 className="mt-0.5 font-display text-[27px] font-extrabold leading-[1.08]">Not sure where it goes?</h2>
          <p className="mt-1.5 text-[15px] leading-snug opacity-90">Ask away. No question is too small.</p>
        </div>
        <div data-depth="-6" className="-mr-1 shrink-0"><Mascot size={66} poke className="hero-mascot" mood={focused || text ? "listening" : "idle"} bump={text.length} /></div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) { onAsk(text); setText(""); } }} data-notilt className="relative mt-3.5 flex items-center gap-2 rounded-[20px] border-2 border-ink bg-white p-1.5 pl-4 text-ink shadow-[0_3px_0_#0a2a20]">
        <span className="relative flex min-w-0 flex-1 overflow-hidden">
          <input value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} maxLength={300} enterKeyHint="send" aria-label="Ask Bin-Buddy"
            className="w-full bg-transparent py-2 text-base outline-none" />
          {!text && <RotatingHint running={!focused} />}
        </span>
        <button disabled={busy || !text.trim()} aria-label="Ask" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf text-white active:scale-95 disabled:opacity-40"><Send size={18} /></button>
      </form>
      <div data-notilt className="relative mt-3 text-ink"><Chips onPick={onAsk} disabled={busy} /></div>
      {count > 0 && <button onClick={onResume} className="relative mt-2 text-[13px] font-bold underline underline-offset-4">See your last answer</button>}
    </section>
  );
}

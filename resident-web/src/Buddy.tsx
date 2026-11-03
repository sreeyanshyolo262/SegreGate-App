import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Send } from "lucide-react";
import { api, type AnswerData, type Session } from "./api";
import AnswerCard from "./AnswerCard";

export const SUGGESTIONS = ["Pizza box", "Used tissue", "Old batteries", "Milk packet", "Eggshells", "Broken glass"];
const THINKING = ["Checking the guide", "Looking through the FAQs", "Finding the right bin"];

// A friendly bin with a face. Calm by default, with a lid that tips while it's thinking.
export function Mascot({ size = 72, thinking = false }: { size?: number; thinking?: boolean }) {
  const ink = "#12332a";
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 84 92" aria-hidden="true" className={`block overflow-visible ${thinking ? "buddy-thinking" : ""}`}>
      <circle cx="26" cy="84" r="5.5" fill={ink} />
      <circle cx="58" cy="84" r="5.5" fill={ink} />
      <path d="M14 34h56l-4 44a5 5 0 0 1-5 4.5H23a5 5 0 0 1-5-4.5z" fill="#a8e6b8" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M22.5 42l2 32M61.5 42l-2 32" stroke={ink} strokeOpacity=".16" strokeWidth="3" strokeLinecap="round" />
      <g className="buddy-eyes">
        <circle cx="33" cy="54" r="3.8" fill={ink} />
        <circle cx="51" cy="54" r="3.8" fill={ink} />
      </g>
      <circle cx="26.5" cy="63" r="4.2" fill="#ffc9b0" />
      <circle cx="57.5" cy="63" r="4.2" fill="#ffc9b0" />
      <path d="M35 64c2.2 3.6 11.8 3.6 14 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <g className="buddy-lid">
        <path d="M63 24c-1-7 2-11 9-13 1 7-2 11-9 13z" fill="#7fd79b" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M32 24v-3a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v3" fill="none" stroke={ink} strokeWidth="3" />
        <rect x="8" y="24" width="68" height="11" rx="5.5" fill="#2f9e5a" stroke={ink} strokeWidth="3" />
      </g>
    </svg>
  );
}

export type BuddyMsg =
  | { id: number; from: "me"; text: string }
  | { id: number; from: "bot"; question: string; status: "ok"; card: AnswerData | null; text: string | null; source: string | null; related: { id: string; question: string }[] }
  | { id: number; from: "bot"; question: string; status: "none" | "busy" | "error"; message?: string; related: { id: string; question: string }[] };

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
      else if (r.card || r.answer) reply = { ...base, status: "ok", card: r.card ?? null, text: r.answer, source: r.source ? `From the Ajmera Infinity ${/faq/i.test(r.source.name) ? "FAQs" : "guidelines"}` : null };
      else reply = { ...base, status: "none" };
    } catch (e) {
      reply = { id: nextId.current++, from: "bot", question: q, status: "error", message: (e as Error).message, related: [] };
    }
    setMsgs((m) => [...m, reply]);
    setBusy(false);
    pending.current = false;
  }, [session]);

  return { msgs, busy, ask };
}

// On phones the keyboard covers the page, so the chat is sized to the part of the screen still visible.
function useVisibleViewport() {
  const [box, setBox] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ height: vv.height, top: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return box;
}

function ThinkingBubble() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % THINKING.length), 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rise flex items-center gap-3" aria-live="polite">
      <Mascot size={40} thinking />
      <p key={i} className="rise text-[15px] font-medium opacity-75">{THINKING[i]}…</p>
    </div>
  );
}

function Chips({ onPick, disabled }: { onPick: (q: string) => void; disabled?: boolean }) {
  return (
    <div className="scroll-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {SUGGESTIONS.map((s) => (
        <button key={s} disabled={disabled} onClick={() => onPick(s)} className="shrink-0 rounded-full border-2 border-ink bg-butter px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:opacity-50">{s}</button>
      ))}
    </div>
  );
}

function Quiet({ title, children, tone = "bg-peach" }: { title: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className={`rise rounded-[22px] border-2 border-ink/15 p-4 ${tone}`}>
      <p className="font-display text-lg font-extrabold leading-tight">{title}</p>
      <div className="mt-1.5 text-[15px] leading-snug">{children}</div>
    </div>
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
  const [text, setText] = useState("");
  const box = useVisibleViewport();
  const lastQuestion = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastMeId = [...msgs].reverse().find((m) => m.from === "me")?.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Bring the newest question to the top, so the answer can be read from its start.
  useEffect(() => { lastQuestion.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [msgs.length]);
  useEffect(() => { if (msgs.length === 0) input.current?.focus(); }, [msgs.length]);

  function submit(q: string) {
    if (!q.trim() || busy) return;
    setText("");
    input.current?.blur();
    onAsk(q);
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-full" style={box ? { height: box.height, transform: `translateY(${box.top}px)` } : undefined} role="dialog" aria-label="Bin-Buddy">
      <div className="sheet-up mx-auto flex h-full max-w-[480px] flex-col bg-cream">
        <header className="flex shrink-0 items-center gap-3 border-b-2 border-ink/10 px-4 pb-2.5 pt-[max(12px,env(safe-area-inset-top))]">
          <button onClick={onClose} aria-label="Back" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink text-butter"><ArrowLeft size={19} /></button>
          <Mascot size={30} />
          <div className="min-w-0 leading-tight">
            <p className="font-display text-lg font-extrabold">Bin-Buddy</p>
            <p className="text-xs font-medium opacity-60">What goes where</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          {msgs.length === 0 && (
            <div className="rise pt-4 text-center">
              <div className="flex justify-center"><Mascot size={84} /></div>
              <p className="mt-3 font-display text-2xl font-extrabold leading-tight">What are you throwing away?</p>
              <p className="mx-auto mt-1.5 max-w-[300px] text-[15px] leading-snug opacity-70">No question is too small. Tell me the item and I'll help you find the right bin.</p>
              <div className="mt-4 text-left"><Chips onPick={submit} /></div>
            </div>
          )}

          {msgs.map((m) => {
            if (m.from === "me") {
              return (
                <div key={m.id} ref={m.id === lastMeId ? lastQuestion : undefined} className="rise flex scroll-mt-3 justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-moss px-4 py-2.5 text-[15px] leading-snug text-white [overflow-wrap:anywhere]">{m.text}</div>
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
                    I've noted your question so it can be added. Your block's Sustainability Volunteer can help in the meantime, and the guide may cover it too.
                    <button onClick={onOpenGuide} className="mt-3 flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold active:scale-95"><BookOpen size={15} /> See the segregation guide</button>
                  </Quiet>
                )}
                {m.status === "busy" && (
                  <Quiet title="I'm a little busy right now" tone="bg-butter">
                    Please try again in a minute.
                    <button disabled={busy} onClick={() => onAsk(m.question)} className="mt-3 block rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:opacity-50">Try again</button>
                  </Quiet>
                )}
                {m.status === "error" && (
                  <Quiet title="That didn't go through" tone="bg-butter">
                    {m.message}
                    <button disabled={busy} onClick={() => onAsk(m.question)} className="mt-3 block rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:opacity-50">Try again</button>
                  </Quiet>
                )}
                {m.related.length > 0 && (
                  <div>
                    <p className="mb-1.5 ml-1 text-xs font-bold opacity-55">You could also ask</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.related.map((r) => (
                        <button key={r.id} disabled={busy} onClick={() => submit(r.question)} className="rounded-2xl border-[1.5px] border-ink/30 bg-white px-3 py-1.5 text-left text-[13px] font-medium leading-tight active:scale-95 disabled:opacity-50">{r.question}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {busy && <ThinkingBubble />}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(text); }} className="shrink-0 border-t-2 border-ink/10 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-center gap-2 rounded-[20px] border-2 border-ink bg-white p-1.5 pl-4">
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} enterKeyHint="send" aria-label="Ask Bin-Buddy" placeholder="What are you throwing away?"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:opacity-45" />
            <button disabled={busy || !text.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-leaf text-white active:scale-95 disabled:opacity-40"><Send size={17} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}

// The main feature of the home screen: a resident can ask straight away, without looking for it.
export function BuddyHero({ onAsk, count, busy, onResume }: { onAsk: (q: string) => void; count: number; busy: boolean; onResume: () => void }) {
  const [text, setText] = useState("");
  return (
    <section className="rise relative mt-5 overflow-hidden rounded-[26px] border-2 border-ink bg-moss p-4 pt-5 text-white shadow-[0_3px_0_#12332a]">
      <span className="float-a absolute -right-8 -top-10 h-36 w-36 rounded-full bg-leaf/70" />
      <span className="float-c absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-leaf/40" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-butter">Bin-Buddy · What goes where</p>
          <h2 className="mt-0.5 font-display text-[27px] font-extrabold leading-[1.08]">Not sure where it goes?</h2>
          <p className="mt-1.5 text-[15px] leading-snug opacity-90">Ask away. No question is too small.</p>
        </div>
        <div className="-mr-1 shrink-0"><Mascot size={66} /></div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) { onAsk(text); setText(""); } }} className="relative mt-3.5 flex items-center gap-2 rounded-[20px] border-2 border-ink bg-white p-1.5 pl-4 text-ink shadow-[0_3px_0_#0a2a20]">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} enterKeyHint="send" aria-label="Ask Bin-Buddy" placeholder="What are you throwing away?"
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:opacity-45" />
        <button disabled={busy || !text.trim()} aria-label="Ask" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf text-white active:scale-95 disabled:opacity-40"><Send size={18} /></button>
      </form>
      <div className="relative mt-3 text-ink"><Chips onPick={onAsk} disabled={busy} /></div>
      {count > 0 && <button onClick={onResume} className="relative mt-2 text-[13px] font-bold underline underline-offset-4">See your last answer</button>}
    </section>
  );
}

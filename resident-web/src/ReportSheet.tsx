import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Check, CheckCheck, ClipboardCopy, ExternalLink, FileText, PartyPopper, RotateCcw, Search, Send, Sparkles, Sprout, Trash2, TriangleAlert, Wrench, X, type LucideIcon } from "lucide-react";
import { api, type Session, type TroubleCheck, type TroubleResult } from "./api";
import Linkified from "./Linkified";

const PLAY = "https://play.google.com/store/apps/details?id=com.mygate.user";
const APP_STORE = "https://apps.apple.com/in/app/mygate-premium/id1101762651";

// MyGate has no public API for raising tickets, so this opens their app using the links they publish for it.
function mygateLinks() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return { open: `intent://mygate.com/dl/#Intent;scheme=https;package=com.mygate.user;S.browser_fallback_url=${encodeURIComponent(PLAY)};end`, store: PLAY };
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return { open: "https://mygate.com/dl/", store: APP_STORE };
  return { open: "https://mygate.com", store: null };
}

const PROBLEMS: { text: string; icon: LucideIcon; tone: string }[] = [
  { text: "My waste wasn't collected", icon: Trash2, tone: "bg-blush" },
  { text: "My bin keeps getting skipped", icon: RotateCcw, tone: "bg-peach" },
  { text: "Someone left waste in the stairwell", icon: TriangleAlert, tone: "bg-butter" },
  { text: "I don't know which bin something goes in", icon: Search, tone: "bg-sky" },
];
const TONES = ["bg-sky", "bg-mint", "bg-peach", "bg-butter", "bg-blush"];

function Thinking({ result, faqCount, onDone }: { result: TroubleResult | null; faqCount: number | null; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = [650, 1500, 2350].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Once the answer is back and the steps have played, reveal what was really consulted, then move on.
  const ready = !!result && step >= 3;
  useEffect(() => {
    if (!ready || !result) return;
    if (shown < result.consulted.length) {
      const t = setTimeout(() => setShown((s) => s + 1), 340);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 850);
    return () => clearTimeout(t);
  }, [ready, shown, result, onDone]);

  const faqs = result?.counts.faqs ?? faqCount;
  const steps = [
    "Reading your problem",
    faqs ? `Going through ${faqs} FAQs` : "Going through the FAQs",
    result ? `Checking ${result.counts.guidelines} guidelines` : "Checking the guidelines",
  ];

  return (
    <div className="rise">
      <div className="card relative overflow-hidden bg-moss p-5 text-white">
        <span className="float-a absolute -right-6 -top-6 h-24 w-24 rounded-full bg-butter/25" />
        <span className="float-c absolute -bottom-8 left-1/2 h-16 w-16 rounded-full bg-leaf/70" />
        <div className="relative flex items-center gap-3">
          <span className="think-bob grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-white bg-butter text-ink"><Sprout size={23} /></span>
          <div>
            <p className="font-display text-xl font-extrabold leading-tight">Bin-Buddy is on it</p>
            <p className="text-[13px] opacity-80" aria-live="polite">{ready ? "Found what applies to you" : "Going through your society's rules"}</p>
          </div>
        </div>
      </div>

      <ol className="mt-5 space-y-3" aria-live="polite">
        {steps.map((label, i) => {
          const done = step > i && (i < 2 || !!result);
          const active = !done && step >= i;
          if (step < i) return null;
          return (
            <li key={i} className="rise flex items-center gap-3 text-[15px] font-medium">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink transition-colors ${done ? "bg-mint" : "bg-white"}`}>
                {done ? <Check size={15} strokeWidth={3} /> : <span className={active ? "dots dots-sm" : ""}><span /></span>}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      {ready && result && result.consulted.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider opacity-55">What I read</p>
          <ul className="space-y-2">
            {result.consulted.slice(0, shown).map((c) => (
              <li key={c.title} className="rise flex items-start gap-2.5 rounded-2xl border-2 border-ink bg-white px-3 py-2.5 text-[13px] font-medium leading-snug">
                {c.type === "FAQ" ? <BookOpen size={15} className="mt-0.5 shrink-0 text-leaf" /> : <FileText size={15} className="mt-0.5 shrink-0 text-leaf" />}
                <span className="min-w-0">{c.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Checks({ checks, onAllGood, onFix }: { checks: TroubleCheck[]; onAllGood: () => void; onFix: (c: TroubleCheck) => void }) {
  const [index, setIndex] = useState(0);
  const [saidNo, setSaidNo] = useState(false);
  const check = checks[index];
  const next = () => {
    setSaidNo(false);
    if (index + 1 >= checks.length) onAllGood(); else setIndex(index + 1);
  };

  return (
    <div>
      <p className="font-display text-xl font-extrabold leading-tight">A few quick checks</p>
      <p className="mt-1 text-sm opacity-65">Collectors can skip a bin if one of these was missed.</p>

      <div className="mt-4 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={index + 1} aria-label={`Check ${index + 1} of ${checks.length}`}>
        {checks.map((_, i) => <span key={i} className={`h-2.5 flex-1 rounded-full border-2 border-ink transition-colors duration-300 ${i < index ? "bg-leaf" : i === index ? "bg-butter" : "bg-white"}`} />)}
      </div>

      {index > 0 && (
        <ul className="mt-4 space-y-1.5">
          {checks.slice(0, index).map((c) => (
            <li key={c.question} className="flex items-start gap-2 text-[13px] opacity-65"><Check size={14} strokeWidth={3} className="mt-0.5 shrink-0 text-leaf" /><span className="min-w-0">{c.question}</span></li>
          ))}
        </ul>
      )}

      <div key={index} className={`card rise mt-4 p-4 ${TONES[index % TONES.length]}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-55">Check {index + 1} of {checks.length}</p>
        <p className="mt-1 font-display text-[21px] font-extrabold leading-tight">{check.question}</p>
        {check.why && <p className="mt-2 text-sm leading-snug opacity-80">{check.why}</p>}
        {check.source && <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium leading-snug opacity-60"><BookOpen size={12} className="mt-px shrink-0" /><span className="min-w-0">From: {check.source}</span></p>}

        {!saidNo ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={next} className="press card flex h-14 items-center justify-center gap-2 bg-leaf font-display text-lg font-extrabold text-white"><Check size={20} strokeWidth={3} /> Yes</button>
            <button onClick={() => setSaidNo(true)} className="press card flex h-14 items-center justify-center gap-2 bg-white font-display text-lg font-extrabold"><X size={20} strokeWidth={3} /> No</button>
          </div>
        ) : (
          <div className="rise mt-4 rounded-2xl bg-white p-3.5">
            <p className="flex items-center gap-2 font-display text-base font-extrabold"><Wrench size={17} /> This could be why</p>
            <p className="mt-1 text-[15px] leading-snug">{check.fix}</p>
            <button onClick={() => onFix(check)} className="press card mt-3 h-12 w-full bg-butter font-display text-base font-extrabold">Okay, I'll fix this</button>
            <button onClick={next} className="mt-2 h-10 w-full text-sm font-bold underline underline-offset-4">Actually, I did this</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Ticket({ category, session, onDone }: { category: string; session: Session; onDone: () => void }) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const links = mygateLinks();
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const where = session.block === "Villows" ? `Villows ${session.flat}` : `Block ${session.block}, Flat ${session.flat}`;
  const details = `Waste not collected on ${date} from ${where}, Ajmera Infinity. It was segregated as per the society guidelines and kept out for collection. Please arrange collection.`;

  async function copy() {
    try { await navigator.clipboard.writeText(details); setCopied("yes"); }
    catch { setCopied("no"); }
  }

  const steps = [
    <>In MyGate, open <b>Community</b> at the bottom</>,
    <>Scroll down and tap <b>Helpdesk</b></>,
    <>Raise a <b>new ticket</b></>,
    <>Choose the category <b>{category}</b></>,
    <>Paste the details below and submit</>,
  ];

  return (
    <div>
      <div className="card rise relative overflow-hidden bg-mint p-5">
        <span className="float-a absolute -right-5 -top-5 h-20 w-20 rounded-full bg-butter" />
        <span className="float-b absolute bottom-3 right-14 h-6 w-6 rounded-full bg-peach" />
        <span className="pop-in relative grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-white"><PartyPopper size={23} /></span>
        <p className="relative mt-3 font-display text-2xl font-extrabold leading-tight">You did everything right</p>
        <p className="relative mt-1 text-[15px] leading-snug opacity-80">So this shouldn't have been skipped. Raise a ticket on MyGate and the society team will pick it up.</p>
      </div>

      <h2 className="mb-3 mt-6 font-display text-lg font-extrabold">How to raise it</h2>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="rise flex items-center gap-3 text-[15px] leading-snug" style={{ animationDelay: `${i * 70}ms` }}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink font-display text-sm font-extrabold ${TONES[i % TONES.length]}`}>{i + 1}</span>
            <span className="min-w-0">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-[20px] border-2 border-ink bg-white p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-55">Ticket details</p>
        <p className="mt-1 select-text text-sm leading-snug">{details}</p>
        <button onClick={copy} className="mt-3 flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-butter px-4 text-sm font-bold active:scale-95">
          {copied === "yes" ? <><CheckCheck size={16} /> Copied</> : <><ClipboardCopy size={16} /> Copy details</>}
        </button>
        {copied === "no" && <p className="mt-2 text-xs opacity-70">Couldn't copy automatically. Press and hold the text above to copy it.</p>}
      </div>

      <a href={links.open} onClick={copy} className="press card mt-4 flex h-14 items-center justify-center gap-2.5 bg-moss font-display text-lg font-extrabold text-white">
        Open MyGate <ExternalLink size={19} />
      </a>
      <p className="mt-2 text-center text-xs opacity-65">We'll copy the details for you when you tap this.</p>
      {links.store && <a href={links.store} target="_blank" rel="noopener noreferrer" className="mt-1 block py-2 text-center text-[13px] font-bold underline underline-offset-4">Don't have MyGate? Get the app</a>}
      <button onClick={onDone} className="mt-1 h-11 w-full text-sm font-bold opacity-70">Done</button>
    </div>
  );
}

export default function ReportSheet({ session, faqCount, onClose }: { session: Session; faqCount: number | null; onClose: () => void }) {
  type Phase = "ask" | "thinking" | "checks" | "fix" | "ticket" | "answer";
  const [phase, setPhase] = useState<Phase>("ask");
  const [text, setText] = useState("");
  const [result, setResult] = useState<TroubleResult | null>(null);
  const [fix, setFix] = useState<TroubleCheck | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function start(problem: string) {
    problem = problem.trim();
    if (!problem) return;
    setText(problem); setResult(null); setError(""); setPhase("thinking");
    try {
      setResult(await api.troubleshoot(problem, session));
    } catch (e) {
      setError((e as Error).message);
      setPhase("ask");
    }
  }
  const reset = () => { setPhase("ask"); setText(""); setResult(null); setFix(null); setError(""); };
  const finishThinking = () => setPhase((p) => (p !== "thinking" ? p : result?.kind === "missed" ? "checks" : "answer"));

  return (
    <div className="sheet-up fixed inset-0 z-50 bg-cream" role="dialog" aria-label="Report a problem">
      <div className="mx-auto h-full max-w-[480px] overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-cream px-4 pb-2.5 pt-[max(12px,env(safe-area-inset-top))]">
          <button onClick={onClose} aria-label="Back" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink text-butter"><ArrowLeft size={19} /></button>
          <p className="font-display text-lg font-extrabold">Report a problem</p>
        </div>

        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-2">
          {phase === "ask" && (
            <div className="rise">
              <div className="card relative overflow-hidden bg-moss p-5 text-white">
                <span className="float-a absolute -right-8 -top-8 h-28 w-28 rounded-full bg-butter/25" />
                <span className="float-c absolute -bottom-8 right-20 h-16 w-16 rounded-full bg-leaf/70" />
                <p className="relative flex items-center gap-2 text-[13px] font-bold opacity-85"><Sparkles size={15} /> Bin-Buddy can help</p>
                <h1 className="relative mt-1 font-display text-[28px] font-extrabold leading-none">What went wrong?</h1>
              </div>

              {error && <p className="rise mt-4 rounded-2xl border-2 border-ink bg-blush px-4 py-3 text-sm font-medium">{error}</p>}

              <div className="mt-5 space-y-3">
                {PROBLEMS.map(({ text: t, icon: Icon, tone }, i) => (
                  <button key={t} onClick={() => start(t)} style={{ animationDelay: `${i * 50}ms` }} className={`press card rise flex w-full items-center gap-3 p-3 text-left ${tone}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white"><Icon size={19} /></span>
                    <span className="min-w-0 font-display text-base font-bold leading-snug">{t}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); start(text); }} className="mt-5">
                <label htmlFor="problem" className="mb-2 block font-display text-base font-extrabold">Or tell me in your own words</label>
                <div className="flex items-center gap-2 rounded-[20px] border-2 border-ink bg-white p-2 pl-4">
                  <input id="problem" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Describe the problem…"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:opacity-40" />
                  <button disabled={!text.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf text-white active:scale-95 disabled:opacity-40"><Send size={17} /></button>
                </div>
              </form>
            </div>
          )}

          {phase === "thinking" && <Thinking result={result} faqCount={faqCount} onDone={finishThinking} />}

          {phase === "checks" && result?.kind === "missed" && (
            <Checks checks={result.checks} onAllGood={() => setPhase("ticket")} onFix={(c) => { setFix(c); setPhase("fix"); }} />
          )}

          {phase === "ticket" && result?.kind === "missed" && <Ticket category={result.category} session={session} onDone={onClose} />}

          {phase === "fix" && fix && (
            <div className="rise">
              <div className="card bg-butter p-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-white"><Wrench size={22} /></span>
                <p className="mt-3 font-display text-2xl font-extrabold leading-tight">That's an easy fix</p>
                <p className="mt-2 text-[15px] leading-snug">{fix.fix}</p>
              </div>
              <p className="mt-4 text-[15px] leading-snug opacity-80">If it still isn't collected after that, come back here and I'll help you raise a ticket.</p>
              <button onClick={onClose} className="press card mt-5 h-14 w-full bg-moss font-display text-lg font-extrabold text-white">Got it</button>
              <button onClick={() => { setFix(null); setPhase("checks"); }} className="mt-2 h-11 w-full text-sm font-bold underline underline-offset-4">Go back to the checks</button>
            </div>
          )}

          {phase === "answer" && result?.kind === "answer" && (
            <div className="rise">
              <div className="ml-auto w-fit max-w-[88%] rounded-2xl border-2 border-ink bg-moss px-4 py-2.5 text-[15px] leading-snug text-white">{text}</div>
              <div className={`card mt-4 p-4 ${result.answer ? "bg-mint" : "bg-peach"}`}>
                <p className="flex items-center gap-2 font-display text-lg font-extrabold"><Sprout size={19} /> {result.answer ? "Here's what the rules say" : "I couldn't find this one"}</p>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-snug [overflow-wrap:anywhere]">
                  {result.answer ? <Linkified text={result.answer} /> : "It isn't covered in Ajmera Infinity's guidelines or FAQs yet. I've noted it for the committee. For help right now, talk to your block's Sustainability Volunteer."}
                </p>
                {result.answer && <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium opacity-60"><BookOpen size={12} /> From Ajmera Infinity's rules</p>}
              </div>
              {result.answer && <p className="mt-4 text-sm leading-snug opacity-75">Still stuck? Your block's Sustainability Volunteer can help.</p>}
              <button onClick={reset} className="press card mt-5 flex h-13 w-full items-center justify-center gap-2 bg-butter py-3.5 font-display text-base font-extrabold"><RotateCcw size={17} /> Report something else</button>
              <button onClick={onClose} className="mt-1 h-11 w-full text-sm font-bold opacity-70">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

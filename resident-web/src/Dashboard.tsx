import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Megaphone, Send, Sprout, BookOpen, CircleHelp, ChevronRight, TriangleAlert } from "lucide-react";
import { api, type Announcement, type Answer, type Faq, type Session } from "./api";
import { Card } from "./ui";
import GuideViewer, { GUIDE_SRC } from "./GuideViewer";
import FaqSheet from "./FaqSheet";
import ReportSheet from "./ReportSheet";
import { InstallHelp, InstallStrip } from "./Install";
import Linkified from "./Linkified";
import InstagramSection, { InstagramButton } from "./Instagram";

const TONE = { notice: "sky", event: "peach", challenge: "butter" } as const;
const LABEL = { notice: "Notice", event: "Event", challenge: "Challenge" } as const;
const SUGGEST = ["Where does a pizza box go?", "Used battery", "Old clothes"];
const SHOW = 2;

function EventDate({ iso }: { iso: string }) {
  const d = new Date(iso + "T00:00:00");
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white leading-none">
      <div className="text-center">
        <p className="font-display text-lg font-extrabold">{d.getDate()}</p>
        <p className="text-[10px] font-bold uppercase">{d.toLocaleString("en", { month: "short" })}</p>
      </div>
    </div>
  );
}

function NoticeCard({ n }: { n: Announcement }) {
  return (
    <Card tone={TONE[n.type]} className="rise flex gap-3 p-3.5">
      {n.type === "event" && n.eventDate ? <EventDate iso={n.eventDate} /> : <Megaphone size={20} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-55">{n.pinned ? "Pinned · " : ""}{LABEL[n.type]}</p>
        <p className="text-[15px] font-bold leading-snug">{n.title}</p>
        {n.body && <p className="mt-0.5 whitespace-pre-line text-[13px] opacity-80 [overflow-wrap:anywhere]"><Linkified text={n.body} /></p>}
        {n.type === "event" && (n.eventTime || n.location) && <p className="mt-1 text-[13px] font-medium">{[n.eventTime, n.location].filter(Boolean).join(" · ")}</p>}
      </div>
    </Card>
  );
}

interface Msg { from: "me" | "bot"; text: string; fromGuide?: boolean; related?: { id: string; question: string }[] }

type Sheet = "faq" | "guide" | "report" | "install" | null;

export default function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(() => history.state?.sheet ?? null);
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [faqErr, setFaqErr] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const buddy = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api.announcements().then((a) => { setItems(a); setLoadErr(false); }).catch(() => setLoadErr(true));
  }, []);
  const loadFaqs = useCallback(() => {
    api.faqs().then((f) => { setFaqs(f); setFaqErr(false); }).catch(() => setFaqErr(true));
  }, []);
  useEffect(() => {
    const refresh = () => { load(); loadFaqs(); };
    refresh();
    const t = setInterval(refresh, 30000);
    const vis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [load, loadFaqs]);

  // Full-screen views live in browser history, so the phone's back gesture closes them instead of leaving the app.
  useEffect(() => {
    const onPop = () => setSheet(history.state?.sheet ?? null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const openSheet = (s: Exclude<Sheet, null>) => { history.pushState({ sheet: s }, ""); setSheet(s); };
  const closeSheet = useCallback(() => { if (history.state?.sheet) history.back(); else setSheet(null); }, []);

  useEffect(() => { if (started.current) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, busy]);

  async function send(q: string) {
    q = q.trim();
    if (!q || busy) return;
    started.current = true;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setText(""); setBusy(true);
    try {
      const r: Answer = await api.ask(q, session);
      setMsgs((m) => [...m, r.answer
        ? { from: "bot", text: r.answer, fromGuide: true, related: r.related.slice(0, 2) }
        : { from: "bot", text: "I couldn't find that in Ajmera Infinity's guidelines. I've noted it so the committee can add an answer.", related: r.related.slice(0, 2) }]);
    } catch (e) {
      setMsgs((m) => [...m, { from: "bot", text: (e as Error).message }]);
    }
    setBusy(false);
  }

  function askFromFaq(q?: string) {
    closeSheet();
    setTimeout(() => {
      buddy.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (q) send(q); else input.current?.focus();
    }, 120);
  }

  // Hide the FAQs tile if they have never loaded, so a failure doesn't leave a dead button.
  const showFaqTile = faqs ? faqs.length > 0 : !faqErr;
  const visible = items ? (showAll ? items : items.slice(0, SHOW)) : [];
  const hidden = items ? items.length - visible.length : 0;
  const where = session.block === "Villows" ? "Villows" : `Block ${session.block}`;

  return (
    <div className="px-5 pb-12 pt-7">
      <header className="rise flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-55">Ajmera Infinity</p>
          <h1 className="font-display text-[28px] font-extrabold leading-tight">Welcome home</h1>
          <p className="mt-0.5 text-sm font-medium opacity-65">{where} · Flat {session.flat}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InstagramButton />
          <button onClick={onSignOut} aria-label="Sign out" title="Sign out" className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink/15 text-ink/70 active:scale-95"><LogOut size={17} /></button>
        </div>
      </header>

      <section className={`rise mt-7 grid gap-3 ${showFaqTile ? "grid-cols-2" : "grid-cols-1"}`}>
        <button onClick={() => openSheet("guide")} className="card press relative flex flex-col items-start justify-start overflow-hidden bg-mint p-3.5 text-left">
          <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-leaf/15" />
          <span className="relative block h-14 w-11 overflow-hidden rounded-lg border-2 border-ink bg-white">
            <img src={GUIDE_SRC} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
          </span>
          <span className="relative mt-3 block font-display text-[17px] font-extrabold leading-tight">Segregation guide</span>
          <span className="relative mt-0.5 block text-[13px] leading-snug opacity-70">What goes in each bin</span>
        </button>
        {showFaqTile && (
          <button onClick={() => { loadFaqs(); openSheet("faq"); }} className="card press relative flex flex-col items-start justify-start overflow-hidden bg-butter p-3.5 text-left">
            <span className="float-a absolute -right-5 -top-5 h-16 w-16 rounded-full bg-peach" />
            <span className="relative grid h-14 w-11 place-items-center rounded-lg border-2 border-ink bg-white"><CircleHelp size={24} /></span>
            <span className="relative mt-3 block font-display text-[17px] font-extrabold leading-tight">FAQs</span>
            <span className="relative mt-0.5 block text-[13px] leading-snug opacity-70">{faqs ? `${faqs.length} quick answers` : "Quick answers"}</span>
          </button>
        )}
      </section>

      <button onClick={() => { loadFaqs(); openSheet("report"); }} className="card press rise mt-3 flex w-full items-center gap-3 bg-blush p-3 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-white"><TriangleAlert size={21} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] font-extrabold leading-tight">Report a problem</span>
          <span className="block text-[13px] leading-snug opacity-70">Waste not collected? Let's sort it</span>
        </span>
        <ChevronRight size={20} className="shrink-0" />
      </button>
      <InstallStrip onNeedHelp={() => openSheet("install")} />

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-extrabold">Notices &amp; events</h2>
        <div className="space-y-3">
          {items === null && !loadErr && [0, 1].map((i) => <div key={i} className="skeleton card h-[72px]" />)}
          {loadErr && items === null && (
            <Card tone="blush" className="p-4 text-sm"><p className="font-bold">Couldn't load notices</p>
              <button onClick={load} className="mt-1 font-bold underline">Try again</button></Card>
          )}
          {items?.length === 0 && <p className="rounded-2xl border-2 border-dashed border-ink/20 px-4 py-5 text-center text-sm opacity-60">Nothing new right now.</p>}
          {visible.map((n) => <NoticeCard key={n.id} n={n} />)}
        </div>
        {hidden > 0 && <button onClick={() => setShowAll(true)} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-4">Show {hidden} more</button>}
        {showAll && items && items.length > SHOW && <button onClick={() => setShowAll(false)} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-4">Show less</button>}
      </section>

      <section ref={buddy} className="mt-9 scroll-mt-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-butter"><Sprout size={21} /></div>
          <div>
            <h2 className="font-display text-xl font-extrabold leading-tight">Bin-Buddy</h2>
            <p className="text-[13px] font-medium opacity-60">What goes where</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border-2 border-ink bg-white">
          <div className="space-y-3 p-4">
            {msgs.length === 0 && (
              <div>
                <p className="text-[15px] leading-snug opacity-80">Not sure which bin? Ask about any item, like <span className="font-bold">"banana peel"</span> or <span className="font-bold">"used tissue"</span>.</p>
                <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scroll-hide">
                  {SUGGEST.map((s) => (
                    <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border-2 border-ink bg-butter px-3.5 py-1.5 text-sm font-medium active:scale-95">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`rise flex ${m.from === "me" ? "justify-end" : ""}`}>
                <div className="max-w-[88%]">
                  <div className={`rounded-2xl border-2 border-ink px-4 py-2.5 text-[15px] leading-snug ${m.from === "me" ? "bg-moss text-white" : "bg-cream"}`}>{m.text}</div>
                  {m.fromGuide && <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium opacity-55"><BookOpen size={11} />From Ajmera Infinity guidelines</p>}
                  {m.related && m.related.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.related.map((r) => (
                        <button key={r.id} onClick={() => send(r.question)} className="rounded-full border-[1.5px] border-ink/40 bg-white px-2.5 py-1 text-left text-xs font-medium active:scale-95">{r.question}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex">
                <div className="rounded-2xl border-2 border-ink bg-cream px-4 py-3"><span className="dots"><span /><span /><span /></span></div>
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t-2 border-ink px-3 py-2.5">
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type an item…" maxLength={300}
              className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-base outline-none placeholder:opacity-40" />
            <button disabled={busy || !text.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf text-white active:scale-95 disabled:opacity-40"><Send size={17} /></button>
          </form>
        </div>
      </section>

      <InstagramSection />

      {sheet === "guide" && <GuideViewer onClose={closeSheet} />}
      {sheet === "report" && <ReportSheet session={session} faqCount={faqs?.length ?? null} onClose={closeSheet} />}
      {sheet === "install" && <InstallHelp onClose={closeSheet} />}
      {sheet === "faq" && <FaqSheet faqs={faqs} failed={faqErr} onRetry={loadFaqs} onClose={closeSheet} onAsk={askFromFaq} />}
    </div>
  );
}

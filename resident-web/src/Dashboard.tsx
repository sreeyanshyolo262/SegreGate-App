import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Megaphone, CircleHelp, ChevronRight, HeartHandshake, Sprout } from "lucide-react";
import { api, type Announcement, type Faq, type Session } from "./api";
import { Card } from "./ui";
import GuideViewer, { GUIDE_SRC, GUIDE_THUMB } from "./GuideViewer";
import FaqSheet from "./FaqSheet";
import ReportSheet from "./ReportSheet";
import BuddySheet, { BuddyHero, useBuddy } from "./Buddy";
import { Mascot } from "./Mascot";
import BinCarousel from "./BinCarousel";
import TruckScene from "./TruckScene";
import { InstallHelp, InstallStrip } from "./Install";
import Linkified from "./Linkified";
import InstagramSection, { InstagramButton } from "./Instagram";
import { SheetStage, type Entrance } from "./Sheet";
import { canMorph, morph, prefersReducedMotion, useOnScreen, useReveal } from "./motion";

const TONE = { notice: "sky", event: "peach", challenge: "butter" } as const;
const LABEL = { notice: "Update", event: "Event", challenge: "Challenge" } as const;
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
    <Card soft tone={TONE[n.type]} className="rise flex gap-3 p-3.5">
      {n.type === "event" && n.eventDate ? <EventDate iso={n.eventDate} /> : <Megaphone size={20} className="mt-0.5 shrink-0 opacity-70" />}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-55">{n.pinned ? "Pinned · " : ""}{LABEL[n.type]}</p>
        <p className="text-[15px] font-bold leading-snug">{n.title}</p>
        {n.body && <p className="mt-0.5 whitespace-pre-line text-[13px] opacity-80 [overflow-wrap:anywhere]"><Linkified text={n.body} pill /></p>}
        {n.type === "event" && (n.eventTime || n.location) && <p className="mt-1 text-[13px] font-medium">{[n.eventTime, n.location].filter(Boolean).join(" · ")}</p>}
      </div>
    </Card>
  );
}

type Sheet = "faq" | "guide" | "report" | "install" | "buddy" | null;

// The regular refresh only redraws the page if something actually changed, so it can't interrupt scrolling.
const unchanged = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(() => history.state?.sheet ?? null);
  const [stage, setStage] = useState<{ shown: Sheet; leaving: boolean; entrance: Entrance }>({ shown: sheet, leaving: false, entrance: "none" });
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [faqErr, setFaqErr] = useState(false);
  const { msgs, busy, ask } = useBuddy(session);

  const header = useRef<HTMLElement>(null);
  const hero = useRef<HTMLElement>(null);
  const bar = useRef<HTMLButtonElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const aurora = useRef<HTMLDivElement>(null);
  useOnScreen(aurora, (on) => aurora.current?.toggleAttribute("data-paused", !on));
  useOnScreen(header, (on) => bar.current?.classList.toggle("is-on", !on));
  useOnScreen(hero, (on) => {
    hero.current?.toggleAttribute("data-paused", !on);
    if (!pill.current) return;
    pill.current.classList.toggle("is-on", !on);
    pill.current.tabIndex = on ? -1 : 0;
    pill.current.setAttribute("aria-hidden", String(on));
  });
  const nextEntrance = useRef<Entrance | null>(null);
  const animateExit = useRef(true);
  const posterMorphed = useRef(false);
  useReveal();

  // A sheet stays on screen while it slides away, then is removed.
  if (sheet && (sheet !== stage.shown || stage.leaving)) {
    setStage({ shown: sheet, leaving: false, entrance: nextEntrance.current ?? (stage.shown && !stage.leaving ? "swap" : "slide") });
    nextEntrance.current = null;
  } else if (!sheet && stage.shown && !stage.leaving) {
    setStage({ ...stage, leaving: true });
  }
  const onGone = useCallback(() => setStage((s) => (s.leaving ? { shown: null, leaving: false, entrance: "slide" } : s)), []);
  const onDragClose = useCallback(() => { posterMorphed.current = false; }, []);

  const load = useCallback(() => {
    api.announcements().then((a) => { setItems((cur) => (unchanged(cur, a) ? cur : a)); setLoadErr(false); }).catch(() => setLoadErr(true));
  }, []);
  const loadFaqs = useCallback(() => {
    api.faqs().then((f) => { setFaqs((cur) => (unchanged(cur, f) ? cur : f)); setFaqErr(false); }).catch(() => setFaqErr(true));
  }, []);
  useEffect(() => {
    const refresh = () => { load(); loadFaqs(); };
    refresh();
    const t = setInterval(refresh, 30000);
    const vis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [load, loadFaqs]);

  // The full poster loads in the background once things are quiet, so it opens instantly.
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const later = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500));
    later(() => { const img = new Image(); img.src = GUIDE_SRC; img.decode?.().catch(() => {}); });
  }, []);

  // Full-screen views live in browser history, so the phone's back gesture closes them instead of leaving the app.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const next: Sheet = history.state?.sheet ?? null;
      // iPhones animate their own back swipe, so don't animate on top of it.
      animateExit.current = !(e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
      if (posterMorphed.current && !next && animateExit.current) {
        posterMorphed.current = false;
        morph(() => { setSheet(null); setStage({ shown: null, leaving: false, entrance: "slide" }); });
        return;
      }
      setSheet(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const openSheet = useCallback((s: Exclude<Sheet, null>) => { animateExit.current = true; history.pushState({ sheet: s }, ""); setSheet(s); }, []);
  const closeSheet = useCallback(() => { if (history.state?.sheet) history.back(); else setSheet(null); }, []);

  // From its tile, the poster grows out of its own thumbnail.
  function openPoster() {
    if (!canMorph()) return openSheet("guide");
    posterMorphed.current = true;
    nextEntrance.current = "none";
    morph(() => openSheet("guide"));
  }

  function askFromHome(q: string) { openSheet("buddy"); ask(q); }
  // From another full-screen view, swap to Bin-Buddy so that going back still lands on the home screen.
  const askFromSheet = useCallback((q?: string) => {
    history.replaceState({ sheet: "buddy" }, "");
    setSheet("buddy");
    if (q) ask(q);
  }, [ask]);
  const openGuideFromBuddy = useCallback(() => openSheet("guide"), [openSheet]);

  // Hide the FAQs tile if they have never loaded, so a failure doesn't leave a dead button.
  const showFaqTile = faqs ? faqs.length > 0 : !faqErr;
  const first = items ? items.slice(0, SHOW) : [];
  const rest = items ? items.slice(SHOW) : [];
  const where = session.block === "Villows" ? "Villows" : `Block ${session.block}`;
  const toTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <>
      <div className="sheet-backdrop" aria-hidden="true" />
      <div className="page px-5 pb-28 pt-7">
        <div ref={aurora} className="aurora" aria-hidden="true"><span /><span /><span /></div>
        <div className="cascade">
          <header ref={header} className="flex items-start justify-between">
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

          <BuddyHero onAsk={askFromHome} count={msgs.length} busy={busy} onResume={() => openSheet("buddy")} heroRef={hero} />

          <aside className="card mt-4 bg-mint p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-white text-leaf"><Sprout size={22} /></span>
              <h2 className="min-w-0 font-display text-xl font-extrabold leading-[1.15]">We're all figuring this out together</h2>
            </div>
            <p className="mt-3 text-[15px] leading-snug">Segregation takes a little getting used to, and this app is here to make it easier. <span className="font-bold">It's mandatory for every household</span>, and getting it right helps protect the people who handle our waste.</p>
          </aside>
        </div>

        <div className="reveal">
          <section className={`mt-4 grid gap-3 ${showFaqTile ? "grid-cols-2" : "grid-cols-1"}`}>
            <button onClick={openPoster} className="tilt card press relative flex flex-col items-start justify-start overflow-hidden bg-mint p-3.5 text-left">
              <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-leaf/15" />
              <span className="poster-3d relative block h-14 w-11 overflow-hidden rounded-lg border-2 border-ink bg-white">
                <img src={GUIDE_THUMB} alt="" width={176} height={248} decoding="async" className="h-full w-full object-cover object-top" style={stage.shown === "guide" ? undefined : { viewTransitionName: "poster" }} />
              </span>
              <span className="relative mt-3 block font-display text-[17px] font-extrabold leading-tight">Segregation guide</span>
              <span className="relative mt-0.5 block text-[13px] leading-snug opacity-70">What goes in each bin</span>
            </button>
            {showFaqTile && (
              <button onClick={() => { loadFaqs(); openSheet("faq"); }} className="tilt card press relative flex flex-col items-start justify-start overflow-hidden bg-butter p-3.5 text-left">
                <span className="float-a absolute -right-5 -top-5 h-16 w-16 rounded-full bg-peach" />
                <span className="poster-3d turned relative grid h-14 w-11 place-items-center rounded-lg border-2 border-ink bg-white"><CircleHelp size={24} /></span>
                <span className="relative mt-3 block font-display text-[17px] font-extrabold leading-tight">FAQs</span>
                <span className="relative mt-0.5 block text-[13px] leading-snug opacity-70">{faqs ? `${faqs.length} quick answers` : "Quick answers"}</span>
              </button>
            )}
          </section>
        </div>

        <div className="reveal"><BinCarousel onAsk={askFromHome} /></div>

        <div className="reveal">
          <button onClick={() => { loadFaqs(); openSheet("report"); }} className="tilt card-soft press relative mt-3 flex w-full items-center gap-3 bg-peach p-3 text-left">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white"><HeartHandshake size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[17px] font-extrabold leading-tight">Need a hand?</span>
              <span className="block text-[13px] leading-snug opacity-75">Waste not collected, or something unclear? We're here to help.</span>
            </span>
            <ChevronRight size={20} className="shrink-0 opacity-60" />
          </button>
          <InstallStrip onNeedHelp={() => openSheet("install")} />
        </div>

        <div className="reveal">
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-extrabold">Community updates</h2>
            <div className="space-y-3">
              {items === null && !loadErr && [0, 1].map((i) => <div key={i} className="skeleton card-soft h-[72px]" />)}
              {loadErr && items === null && (
                <Card soft tone="butter" className="p-4 text-sm"><p className="font-bold">Couldn't load the updates</p>
                  <button onClick={load} className="mt-1 font-bold underline">Try again</button></Card>
              )}
              {items?.length === 0 && <p className="rounded-2xl border-2 border-dashed border-ink/20 px-4 py-5 text-center text-sm opacity-60">Nothing new right now.</p>}
              {first.map((n) => <NoticeCard key={n.id} n={n} />)}
            </div>
            {rest.length > 0 && (
              <>
                <div className={`fold ${showAll ? "open" : ""}`}>
                  <div><div className="fold-body space-y-3 pt-3">{rest.map((n) => <NoticeCard key={n.id} n={n} />)}</div></div>
                </div>
                <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-4">{showAll ? "Show less" : `Show ${rest.length} more`}</button>
              </>
            )}
          </section>
        </div>

        <div className="reveal"><InstagramSection /></div>
        <TruckScene />
      </div>

      <button ref={bar} onClick={toTop} tabIndex={-1} aria-hidden="true" className="compact-bar material">
        <span className="block font-display text-[15px] font-extrabold leading-tight">Welcome home</span>
        <span className="block text-[11px] font-medium leading-tight opacity-60">{where} · Flat {session.flat}</span>
      </button>

      <button ref={pill} onClick={() => openSheet("buddy")} tabIndex={-1} aria-hidden="true" aria-label="Ask Bin-Buddy"
        className="ask-pill flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-ink bg-moss py-1.5 pl-2.5 pr-4 font-display text-[15px] font-extrabold text-white shadow-[0_3px_0_#12332a,0_10px_26px_rgb(15_76_54/.3)]">
        <Mascot size={26} /> Ask Bin-Buddy
      </button>

      <SheetStage.Provider value={{ leaving: stage.leaving, entrance: stage.entrance, animateExit: animateExit.current, onGone, onDragClose }}>
        {stage.shown === "buddy" && <BuddySheet msgs={msgs} busy={busy} onAsk={ask} onClose={closeSheet} onOpenGuide={openGuideFromBuddy} />}
        {stage.shown === "guide" && <GuideViewer onClose={closeSheet} />}
        {stage.shown === "report" && <ReportSheet session={session} faqCount={faqs?.length ?? null} onClose={closeSheet} onAsk={askFromSheet} />}
        {stage.shown === "install" && <InstallHelp onClose={closeSheet} />}
        {stage.shown === "faq" && <FaqSheet faqs={faqs} failed={faqErr} onRetry={loadFaqs} onClose={closeSheet} onAsk={askFromSheet} />}
      </SheetStage.Provider>
    </>
  );
}

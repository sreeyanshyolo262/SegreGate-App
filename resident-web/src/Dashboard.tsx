import { useCallback, useEffect, useState } from "react";
import { LogOut, Megaphone, CircleHelp, ChevronRight, HeartHandshake, Sprout } from "lucide-react";
import { api, type Announcement, type Faq, type Session } from "./api";
import { Card } from "./ui";
import GuideViewer, { GUIDE_SRC } from "./GuideViewer";
import FaqSheet from "./FaqSheet";
import ReportSheet from "./ReportSheet";
import BuddySheet, { BuddyHero, useBuddy } from "./Buddy";
import { InstallHelp, InstallStrip } from "./Install";
import Linkified from "./Linkified";
import InstagramSection, { InstagramButton } from "./Instagram";

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

export default function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(() => history.state?.sheet ?? null);
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [faqErr, setFaqErr] = useState(false);
  const { msgs, busy, ask } = useBuddy(session);

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

  function askFromHome(q: string) { openSheet("buddy"); ask(q); }
  // From another full-screen view, swap to Bin-Buddy so that going back still lands on the home screen.
  function askFromSheet(q?: string) {
    history.replaceState({ sheet: "buddy" }, "");
    setSheet("buddy");
    if (q) ask(q);
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

      <BuddyHero onAsk={askFromHome} count={msgs.length} busy={busy} onResume={() => openSheet("buddy")} />

      <aside className="card rise mt-4 bg-mint p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-white text-leaf"><Sprout size={22} /></span>
          <h2 className="min-w-0 font-display text-xl font-extrabold leading-[1.15]">We're all figuring this out together</h2>
        </div>
        <p className="mt-3 text-[15px] leading-snug">Segregation takes a little getting used to, and this app is here to make it easier. <span className="font-bold">It's mandatory for every household</span>, and getting it right helps protect the people who handle our waste.</p>
      </aside>

      <section className={`rise mt-4 grid gap-3 ${showFaqTile ? "grid-cols-2" : "grid-cols-1"}`}>
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

      <button onClick={() => { loadFaqs(); openSheet("report"); }} className="card-soft press rise mt-3 flex w-full items-center gap-3 bg-peach p-3 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white"><HeartHandshake size={21} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] font-extrabold leading-tight">Need a hand?</span>
          <span className="block text-[13px] leading-snug opacity-75">Waste not collected, or something unclear? We're here to help.</span>
        </span>
        <ChevronRight size={20} className="shrink-0 opacity-60" />
      </button>
      <InstallStrip onNeedHelp={() => openSheet("install")} />


      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-extrabold">Community updates</h2>
        <div className="space-y-3">
          {items === null && !loadErr && [0, 1].map((i) => <div key={i} className="skeleton card-soft h-[72px]" />)}
          {loadErr && items === null && (
            <Card soft tone="butter" className="p-4 text-sm"><p className="font-bold">Couldn't load the updates</p>
              <button onClick={load} className="mt-1 font-bold underline">Try again</button></Card>
          )}
          {items?.length === 0 && <p className="rounded-2xl border-2 border-dashed border-ink/20 px-4 py-5 text-center text-sm opacity-60">Nothing new right now.</p>}
          {visible.map((n) => <NoticeCard key={n.id} n={n} />)}
        </div>
        {hidden > 0 && <button onClick={() => setShowAll(true)} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-4">Show {hidden} more</button>}
        {showAll && items && items.length > SHOW && <button onClick={() => setShowAll(false)} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-4">Show less</button>}
      </section>

      <InstagramSection />

      {sheet === "buddy" && <BuddySheet msgs={msgs} busy={busy} onAsk={ask} onClose={closeSheet} onOpenGuide={() => openSheet("guide")} />}
      {sheet === "guide" && <GuideViewer onClose={closeSheet} />}
      {sheet === "report" && <ReportSheet session={session} faqCount={faqs?.length ?? null} onClose={closeSheet} onAsk={askFromSheet} />}
      {sheet === "install" && <InstallHelp onClose={closeSheet} />}
      {sheet === "faq" && <FaqSheet faqs={faqs} failed={faqErr} onRetry={loadFaqs} onClose={closeSheet} onAsk={askFromSheet} />}
    </div>
  );
}

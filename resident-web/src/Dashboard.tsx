import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Megaphone, Send, Sprout, BookOpen, RefreshCw } from "lucide-react";
import { api, type Announcement, type Answer, type Session } from "./api";
import { Card } from "./ui";

const TONE = { notice: "sky", event: "peach", challenge: "butter" } as const;
const LABEL = { notice: "Notice", event: "Event", challenge: "Challenge" } as const;
const SUGGEST = ["Where does a pizza box go?", "Can I compost tea bags?", "How do I dispose batteries?", "What about broken glass?"];

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
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{n.pinned ? "Pinned · " : ""}{LABEL[n.type]}</p>
        <p className="text-sm font-bold">{n.title}</p>
        {n.body && <p className="mt-0.5 whitespace-pre-line text-xs opacity-75">{n.body}</p>}
        {n.type === "event" && (n.eventTime || n.location) && <p className="mt-1 text-xs font-medium">{[n.eventTime, n.location].filter(Boolean).join(" · ")}</p>}
      </div>
    </Card>
  );
}

interface Msg { from: "me" | "bot"; text: string; ai?: boolean; source?: string; related?: { id: string; question: string }[] }

export default function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const load = useCallback(() => {
    api.announcements().then((a) => { setItems(a); setLoadErr(false); }).catch(() => setLoadErr(true));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [load]);

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
        ? { from: "bot", text: r.answer, ai: r.ai, source: r.source ? `${r.source.name} · updated ${r.source.updatedAt}` : undefined, related: r.related }
        : { from: "bot", text: "I couldn't find that in Ajmera Infinity's guidelines. I've noted your question so the committee can add an answer.", related: r.related }]);
    } catch (e) {
      setMsgs((m) => [...m, { from: "bot", text: (e as Error).message }]);
    }
    setBusy(false);
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <div className="rise flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-60">Ajmera Infinity</p>
          <h1 className="font-display text-[28px] font-extrabold leading-tight">Welcome home</h1>
          <p className="mt-1 inline-block rounded-full bg-ink px-3 py-1 text-xs font-bold text-butter">
            {session.block === "Villows" ? "Villows" : `Block ${session.block}`} · Flat {session.flat}
          </p>
        </div>
        <button onClick={onSignOut} aria-label="Sign out" title="Sign out" className="card press grid h-11 w-11 place-items-center bg-white"><LogOut size={19} /></button>
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">From your committee</h2>
          <button onClick={load} aria-label="Refresh" className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-ink/5"><RefreshCw size={16} /></button>
        </div>
        <div className="space-y-3">
          {items === null && !loadErr && [0, 1].map((i) => <div key={i} className="skeleton card h-[76px]" />)}
          {loadErr && items === null && (
            <Card tone="blush" className="p-4 text-sm"><p className="font-bold">Couldn't load announcements</p>
              <button onClick={load} className="mt-1 font-bold underline">Try again</button></Card>
          )}
          {items?.length === 0 && <Card className="p-4 text-sm opacity-80">Nothing new right now. Check back soon.</Card>}
          {items?.map((n) => <NoticeCard key={n.id} n={n} />)}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-xl font-extrabold">Ask about waste</h2>
        <p className="mb-3 text-sm opacity-65">Answers come from Ajmera Infinity's own guidelines.</p>
        <Card className="overflow-hidden">
          <div className="space-y-3 p-4">
            {msgs.length === 0 && (
              <div className="flex gap-2">
                <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-mint"><Sprout size={16} /></div>
                <div className="card bg-cream px-4 py-2.5 text-[15px] leading-snug">Hi! Ask me where anything goes, like "where do I put a used battery?"</div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`rise flex ${m.from === "me" ? "justify-end" : "gap-2"}`}>
                {m.from === "bot" && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-mint"><Sprout size={16} /></div>}
                <div className="max-w-[82%]">
                  <div className={`card px-4 py-2.5 text-[15px] leading-snug ${m.from === "me" ? "bg-moss text-white" : "bg-cream"}`}>{m.text}</div>
                  {m.ai && <p className="mt-1.5 inline-block rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-butter">AI · from your guidelines</p>}
                  {m.source && <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium opacity-60"><BookOpen size={12} />{m.source}</p>}
                  {m.related && m.related.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.related.map((r) => (
                        <button key={r.id} onClick={() => send(r.question)} className="rounded-full border-2 border-ink bg-butter px-2.5 py-0.5 text-left text-xs font-medium">{r.question}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-2">
                <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-mint"><Sprout size={16} /></div>
                <div className="card bg-cream px-4 py-3"><span className="dots"><span /><span /><span /></span></div>
              </div>
            )}
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGEST.map((s) => (
                  <button key={s} onClick={() => send(s)} className="press rounded-full border-2 border-ink bg-butter px-3 py-1 text-sm font-medium shadow-[0_2px_0_#12332a]">{s}</button>
                ))}
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t-2 border-ink bg-white px-4 py-3">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about any waste item…" maxLength={300}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:opacity-40" />
            <button disabled={busy || !text.trim()} aria-label="Send" className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf text-white disabled:opacity-50"><Send size={17} /></button>
          </form>
        </Card>
      </section>
    </div>
  );
}

import { Bell, Flame, Leaf, Calendar, ChevronRight, Megaphone } from "lucide-react";
import { Card, Header, Ring } from "../ui";
import { resident, week, history, notices as fallbackNotices } from "../data";
import { useLive, type Announcement } from "../live";

const TONE = { notice: "sky", event: "peach", challenge: "butter" } as const;
const LABEL = { notice: "Notice", event: "Event", challenge: "Challenge" } as const;

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
    <Card tone={TONE[n.type]} className="flex gap-3 p-3.5">
      {n.type === "event" && n.eventDate ? <EventDate iso={n.eventDate} /> : <Megaphone size={20} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{n.pinned ? "📌 " : ""}{LABEL[n.type]}</p>
        <p className="text-sm font-bold">{n.title}</p>
        {n.body && <p className="text-xs opacity-70">{n.body}</p>}
        {n.type === "event" && (n.eventTime || n.location) && (
          <p className="mt-1 text-xs font-medium">{[n.eventTime, n.location].filter(Boolean).join(" · ")}</p>
        )}
      </div>
    </Card>
  );
}

export default function HomeScreen({ go }: { go: (t: string) => void }) {
  const r = resident;
  const { announcements, online } = useLive();
  const items: Announcement[] = online
    ? announcements
    : fallbackNotices.map((n, i) => ({ id: -i - 1, type: n.tone === "butter" ? "challenge" : "notice", title: n.title, body: n.body, eventDate: null, eventTime: null, location: null, pinned: false, createdAt: "" }));
  return (
    <div>
      <Header sub={`${r.society} · Flat ${r.flat}`} title={`Hi, ${r.name.split(" ")[0]} 👋`}
        right={<button className="card press grid h-11 w-11 place-items-center bg-white"><Bell size={20} /></button>} />

      <div className="space-y-4 px-5">
        <Card tone="mint" className="flex items-center gap-4 p-4">
          <Ring value={0.78}>
            <span className="font-display text-2xl font-extrabold">78%</span>
            <span className="text-[10px] font-medium opacity-60">segregation</span>
          </Ring>
          <div className="flex-1">
            <p className="text-sm font-medium opacity-70">Flat score</p>
            <p className="font-display text-3xl font-extrabold leading-none">{r.score.toLocaleString()}</p>
            <p className="mt-1 text-xs font-bold text-leaf">▲ {r.weekDelta} this week</p>
            <p className="mt-2 inline-block rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-white">#{r.rank.block} in {r.block}</p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card tone="butter" className="p-4">
            <Flame className="text-orange-500" />
            <p className="mt-2 font-display text-3xl font-extrabold">{r.streak}</p>
            <p className="text-xs font-medium opacity-70">clean pickups in a row</p>
          </Card>
          <Card tone="sky" className="p-4">
            <Leaf className="text-leaf" />
            <p className="mt-2 font-display text-3xl font-extrabold">{r.kgDiverted}<span className="text-base"> kg</span></p>
            <p className="text-xs font-medium opacity-70">diverted · {r.co2Saved} kg CO₂ saved</p>
          </Card>
        </div>

        <Card tone="peach" className="flex items-center gap-3 p-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white"><Calendar /></div>
          <div className="flex-1">
            <p className="text-xs font-medium opacity-70">Next pickup</p>
            <p className="font-display text-lg font-bold">{r.nextPickup.day} · {r.nextPickup.time}</p>
            <p className="text-xs opacity-70">{r.nextPickup.type}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold">This week</p>
            <span className="text-xs font-medium opacity-60">collector checks</span>
          </div>
          <div className="mt-3 flex h-24 items-end justify-between gap-2">
            {week.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className={`w-full rounded-lg border-2 border-ink ${d.ok ? "bg-leaf" : "bg-blush"}`} style={{ height: `${d.v * 0.8}%` }} />
                <span className="text-[11px] font-bold">{d.d}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card tone="moss" onClick={() => go("scan")} className="flex items-center justify-between p-4">
          <div>
            <p className="font-display text-lg font-bold">Not sure where it goes?</p>
            <p className="text-sm opacity-80">Scan an item and get the right bin.</p>
          </div>
          <ChevronRight />
        </Card>

        <div>
          <p className="mb-2 font-display text-lg font-bold">Society notices &amp; events</p>
          <div className="space-y-3">
            {items.length === 0 && <Card className="p-4 text-sm opacity-70">Nothing new from your committee.</Card>}
            {items.map((n) => <NoticeCard key={n.id} n={n} />)}
          </div>
        </div>

        <div>
          <p className="mb-2 font-display text-lg font-bold">Recent bin checks</p>
          <Card className="divide-y-2 divide-ink/10">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <span className={`h-3 w-3 rounded-full ${h.check === "clean" ? "bg-leaf" : "bg-amber-400"}`} />
                <div className="flex-1">
                  <p className="text-sm font-bold">{h.note}</p>
                  <p className="text-xs opacity-60">{h.when}</p>
                </div>
                <span className="text-sm font-bold text-leaf">+{h.pts}</span>
              </div>
            ))}
          </Card>
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}

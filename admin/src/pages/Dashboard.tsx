import { useEffect, useState } from "react";
import { BookOpen, Users, MessageCircleQuestion, AlertCircle, Plus, Check } from "lucide-react";
import { api, type Stats, type Announcement } from "../api";
import { Card, PageHeader, Button, fmtDate } from "../ui";
import type { Page } from "../App";

function Stat({ icon: Icon, label, value, sub, tone }: { icon: typeof BookOpen; label: string; value: number | string; sub: string; tone: string }) {
  return (
    <Card className="p-5">
      <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={20} /></div>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted">{sub}</p>
    </Card>
  );
}

export default function Dashboard({ go, addFromQuestion }: { go: (p: Page) => void; addFromQuestion: (q: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [news, setNews] = useState<Announcement[]>([]);
  const [err, setErr] = useState("");

  const load = () => {
    api.stats().then(setStats).catch((e) => setErr(e.message));
    api.announcements().then(setNews).catch(() => {});
  };
  useEffect(load, []);

  if (err) return <Card className="p-6 text-red-600">{err}</Card>;
  if (!stats) return <p className="text-muted">Loading…</p>;

  const max = Math.max(1, ...stats.days.map((d) => d.asked));
  const rate = stats.questionsWeek ? Math.round((stats.answeredWeek / stats.questionsWeek) * 100) : 0;

  return (
    <div>
      <PageHeader title="Dashboard" sub="What residents see and ask in Ajmera Infinity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="Guidelines & FAQs" value={stats.guidelines} sub="Live in the resident app" tone="bg-brand-soft text-brand-dark" />
        <Stat icon={Users} label="Residents joined" value={stats.residents} sub="Flats that have signed in" tone="bg-amber-100 text-amber-700" />
        <Stat icon={MessageCircleQuestion} label="Questions this week" value={stats.questionsWeek} sub={`${rate}% answered from guidelines`} tone="bg-sky-100 text-sky-700" />
        <Stat icon={AlertCircle} label="Needs an answer" value={stats.gaps} sub="Questions your guidelines missed" tone="bg-red-100 text-red-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold">Resident questions</h2>
              <p className="text-sm text-muted">Last 7 days</p>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand" />Answered</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-red-300" />Not covered</span>
            </div>
          </div>
          <div className="mt-6 flex h-48 items-end gap-3">
            {stats.days.map((d) => (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-medium text-muted">{d.asked || ""}</span>
                <div className="flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-lg" style={{ height: `${(d.asked / max) * 80}%` }}>
                  <div className="bg-red-300" style={{ flex: d.asked - d.answered }} />
                  <div className="bg-brand" style={{ flex: d.answered }} />
                </div>
                <span className="text-xs text-muted">{new Date(d.date + "T00:00:00").toLocaleDateString("en", { weekday: "short" })}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold">Questions to answer</h2>
          <p className="mb-4 text-sm text-muted">Residents asked these and your guidelines had no answer.</p>
          {stats.gapList.length === 0 ? (
            <p className="rounded-xl bg-brand-soft p-4 text-sm text-brand-dark">All caught up. Every question was answered.</p>
          ) : (
            <ul className="space-y-2">
              {stats.gapList.map((g) => (
                <li key={g.id} className="flex items-center gap-2 rounded-xl border border-line p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.text}</p>
                    <p className="text-xs text-muted">Asked {g.times}×{g.by ? ` · latest from ${g.by}` : ""}</p>
                  </div>
                  <button title="Add a guideline" onClick={() => addFromQuestion(g.text)} className="grid h-8 w-8 place-items-center rounded-lg bg-accent"><Plus size={16} /></button>
                  <button title="Dismiss" onClick={() => api.resolveGap(g.text).then(load)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface"><Check size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Latest announcements</h2>
          <Button variant="ghost" onClick={() => go("news")}>Manage</Button>
        </div>
        <div className="divide-y divide-line">
          {news.slice(0, 4).map((n) => (
            <div key={n.id} className="flex items-center gap-3 py-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${n.type === "event" ? "bg-orange-100 text-orange-700" : n.type === "challenge" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{n.type}</span>
              <p className="flex-1 truncate text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted">{fmtDate(n.createdAt)}</p>
            </div>
          ))}
          {news.length === 0 && <p className="py-3 text-sm text-muted">Nothing posted yet.</p>}
        </div>
      </Card>
    </div>
  );
}

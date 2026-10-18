import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Pin, CalendarDays, MapPin, Megaphone, Trophy, Clock } from "lucide-react";
import { api, type Announcement, type AnnType } from "../api";
import { Button, Card, Field, Modal, PageHeader, Toast, fmtDate, inputCls } from "../ui";

const TYPES: { id: AnnType; label: string; hint: string; icon: typeof Megaphone; chip: string; phone: string }[] = [
  { id: "notice", label: "Announcement", hint: "General news or a schedule change", icon: Megaphone, chip: "bg-sky-100 text-sky-700", phone: "#d3e6ff" },
  { id: "event", label: "Event", hint: "Drives, workshops, meetings with a date", icon: CalendarDays, chip: "bg-orange-100 text-orange-700", phone: "#ffe2d4" },
  { id: "challenge", label: "Challenge", hint: "Weekly goals residents can earn points for", icon: Trophy, chip: "bg-amber-100 text-amber-700", phone: "#fff3b0" },
];
const T = (t: AnnType) => TYPES.find((x) => x.id === t)!;

type Draft = { id?: number; type: AnnType; title: string; body: string; eventDate: string; eventTime: string; location: string; pinned: boolean };
const blank: Draft = { type: "notice", title: "", body: "", eventDate: "", eventTime: "", location: "", pinned: false };

function PhonePreview({ d }: { d: Draft }) {
  const t = T(d.type);
  const date = d.eventDate ? new Date(d.eventDate + "T00:00:00") : null;
  return (
    <div className="mx-auto w-64 rounded-[2.2rem] border-[6px] border-ink bg-[#fffbea] p-3 shadow-lg">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink/80" />
      <p className="mb-2 text-sm font-bold">Society notices &amp; events</p>
      <div className="flex gap-2.5 rounded-2xl border-2 border-ink p-3 shadow-[0_3px_0_#16261f]" style={{ background: t.phone }}>
        {d.type === "event" && date ? (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white text-center leading-none">
            <div><p className="text-base font-extrabold">{date.getDate()}</p><p className="text-[9px] font-bold uppercase">{date.toLocaleString("en", { month: "short" })}</p></div>
          </div>
        ) : <t.icon size={18} className="mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">{d.pinned ? "📌 " : ""}{t.label}</p>
          <p className="text-xs font-bold">{d.title || "Your title appears here"}</p>
          {d.body && <p className="text-[11px] opacity-70">{d.body}</p>}
          {d.type === "event" && (d.eventTime || d.location) && <p className="mt-1 text-[11px] font-medium">{[d.eventTime, d.location].filter(Boolean).join(" · ")}</p>}
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-ink/50">Preview of the resident app</p>
    </div>
  );
}

export default function Announcements() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const load = () => api.announcements().then(setRows).catch((e) => setToast({ msg: e.message, error: true }));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); } }, [toast]);

  async function save() {
    if (!draft) return;
    setBusy(true); setErr("");
    try {
      await api.saveAnnouncement({ ...draft, id: draft.id });
      setDraft(null); await load();
      setToast({ msg: draft.id ? "Updated. Residents will see the change within seconds." : "Published. Residents will see it within seconds." });
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function remove(a: Announcement) {
    if (!confirm(`Delete "${a.title}"?\nIt will disappear from the resident app.`)) return;
    try { await api.deleteAnnouncement(a.id); await load(); setToast({ msg: "Deleted" }); }
    catch (e) { setToast({ msg: (e as Error).message, error: true }); }
  }

  const edit = (a: Announcement) => { setErr(""); setDraft({ id: a.id, type: a.type, title: a.title, body: a.body, eventDate: a.eventDate ?? "", eventTime: a.eventTime ?? "", location: a.location ?? "", pinned: a.pinned }); };

  return (
    <div>
      <PageHeader title="Announcements & Events" sub="Everything you publish here appears on every resident's home screen."
        action={<Button onClick={() => { setErr(""); setDraft(blank); }}><Plus size={16} />New post</Button>} />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((a) => {
          const t = T(a.type);
          return (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.chip}`}><t.icon size={12} />{t.label}</span>
                {a.pinned && <span className="flex items-center gap-1 text-xs font-medium text-muted"><Pin size={12} />Pinned</span>}
                <span className="ml-auto text-xs text-muted">{fmtDate(a.createdAt)}</span>
              </div>
              <h3 className="font-semibold">{a.title}</h3>
              {a.body && <p className="mt-1 text-sm text-muted">{a.body}</p>}
              {a.type === "event" && (
                <div className="mt-3 space-y-1 text-sm">
                  {a.eventDate && <p className="flex items-center gap-2"><CalendarDays size={14} className="text-muted" />{fmtDate(a.eventDate)}</p>}
                  {a.eventTime && <p className="flex items-center gap-2"><Clock size={14} className="text-muted" />{a.eventTime}</p>}
                  {a.location && <p className="flex items-center gap-2"><MapPin size={14} className="text-muted" />{a.location}</p>}
                </div>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                <Button variant="ghost" className="flex-1" onClick={() => edit(a)}><Pencil size={14} />Edit</Button>
                <Button variant="danger" onClick={() => remove(a)}><Trash2 size={14} /></Button>
              </div>
            </Card>
          );
        })}
        {rows.length === 0 && <Card className="p-10 text-center text-sm text-muted md:col-span-2">Nothing posted yet. Click “New post” to tell residents something.</Card>}
      </div>

      {draft && (
        <Modal wide title={draft.id ? "Edit post" : "New post"} onClose={() => setDraft(null)}>
          <div className="grid gap-8 md:grid-cols-[1fr_17rem]">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium">What are you posting?</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button key={t.id} onClick={() => setDraft({ ...draft, type: t.id })}
                      className={`rounded-xl border p-3 text-left transition ${draft.type === t.id ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line hover:bg-surface"}`}>
                      <t.icon size={18} className="mb-1.5" />
                      <p className="text-sm font-semibold">{t.label}</p>
                      <p className="text-[11px] leading-tight text-muted">{t.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} placeholder="e.g. E-waste collection drive" autoFocus /></Field>
              <Field label="Details"><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} className={inputCls} placeholder="What do residents need to know?" /></Field>
              {draft.type === "event" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date"><input type="date" value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} className={inputCls} /></Field>
                  <Field label="Time"><input value={draft.eventTime} onChange={(e) => setDraft({ ...draft, eventTime: e.target.value })} className={inputCls} placeholder="10:00 am – 1:00 pm" /></Field>
                  <div className="sm:col-span-2"><Field label="Location"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={inputCls} placeholder="Clubhouse lawn" /></Field></div>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} className="h-4 w-4 accent-[#3f9a3a]" />
                Pin to the top of residents' home screen
              </label>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={save} disabled={busy}>{busy ? "Publishing…" : draft.id ? "Save changes" : "Publish"}</Button>
              </div>
            </div>
            <PhonePreview d={draft} />
          </div>
        </Modal>
      )}
      {toast && <Toast {...toast} />}
    </div>
  );
}

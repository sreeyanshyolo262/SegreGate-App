import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { api, FAQ_TOPICS, type Faq, type FaqTopic } from "../api";
import { Button, Card, Field, Modal, PageHeader, Toast, fmtDate, inputCls } from "../ui";

const BADGE: Record<FaqTopic, string> = {
  Rules: "bg-sky-100 text-sky-700",
  "Bins & liners": "bg-green-100 text-green-700",
  "Special cases": "bg-orange-100 text-orange-700",
  Collection: "bg-amber-100 text-amber-700",
  Help: "bg-rose-100 text-rose-700",
  "Why it matters": "bg-emerald-900 text-white",
};

type Draft = { id?: string; topic: FaqTopic; question: string; answer: string };
const blank: Draft = { topic: "Rules", question: "", answer: "" };

export default function Faqs() {
  const [rows, setRows] = useState<Faq[]>([]);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<"All" | FaqTopic>("All");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.faqs().then(setRows).catch((e) => setToast({ msg: e.message, error: true }));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); } }, [toast]);

  const shown = useMemo(() => rows.filter((r) =>
    (topic === "All" || r.topic === topic) &&
    (!q || `${r.question} ${r.answer}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, topic]);

  async function save() {
    if (!draft) return;
    setBusy(true); setErr("");
    try {
      await api.saveFaq(draft);
      const wasEdit = !!draft.id;
      setDraft(null); await load();
      setToast({ msg: wasEdit ? "FAQ updated. Residents will see it within a minute." : "FAQ added. Residents will see it within a minute." });
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function remove(f: Faq) {
    if (!confirm(`Delete "${f.question}"?\nResidents will no longer see it.`)) return;
    try { await api.deleteFaq(f.id); await load(); setToast({ msg: "FAQ deleted" }); }
    catch (e) { setToast({ msg: (e as Error).message, error: true }); }
  }

  return (
    <div>
      <PageHeader title="FAQs" sub="Shown to residents on the FAQs screen, and used by Bin-Buddy to answer questions."
        action={<Button onClick={() => { setErr(""); setDraft(blank); }}><Plus size={16} />New FAQ</Button>} />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-60 flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search FAQs…" className={`${inputCls} pl-10`} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...FAQ_TOPICS] as const).map((t) => (
              <button key={t} onClick={() => setTopic(t)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${topic === t ? "bg-brand-dark text-white" : "bg-surface text-muted hover:bg-brand-soft"}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-line">
          {shown.map((f) => (
            <div key={f.id} className="flex items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[f.topic] ?? "bg-slate-100 text-slate-700"}`}>{f.topic}</span>
                  <span className="text-xs text-muted">Updated {fmtDate(f.updatedAt)}</span>
                </div>
                <p className="font-medium">{f.question}</p>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted">{f.answer}</p>
              </div>
              <div className="flex gap-2">
                <button title="Edit" onClick={() => { setErr(""); setDraft({ id: f.id, topic: f.topic, question: f.question, answer: f.answer }); }} className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface"><Pencil size={15} /></button>
                <button title="Delete" onClick={() => remove(f)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="p-10 text-center text-sm text-muted">No FAQs match. Try a different search or add a new one.</p>}
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">{shown.length} of {rows.length} FAQs</p>
      </Card>

      {draft && (
        <Modal title={draft.id ? "Edit FAQ" : "New FAQ"} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="Topic" hint="Residents can filter by topic, and each one has its own colour.">
              <select value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value as FaqTopic })} className={inputCls}>
                {FAQ_TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Question">
              <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} className={inputCls} placeholder="e.g. What are the timings of waste collection?" autoFocus />
            </Field>
            <Field label="Answer" hint="Each new line is a new paragraph. Start a line with • or - to make a bullet. Links become tappable.">
              <textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} rows={8} className={inputCls} placeholder="Tell residents exactly what to do." />
            </Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save & publish"}</Button>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast {...toast} />}
    </div>
  );
}

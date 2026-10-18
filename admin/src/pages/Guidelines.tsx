import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { api, CATEGORIES, type Guideline, type Category } from "../api";
import { Button, Card, Field, Modal, PageHeader, Toast, fmtDate, inputCls } from "../ui";

const BADGE: Record<Category, string> = {
  "Wet waste": "bg-green-100 text-green-700",
  "Dry waste": "bg-blue-100 text-blue-700",
  "Reject waste": "bg-red-100 text-red-700",
  "E-waste": "bg-purple-100 text-purple-700",
  Pickup: "bg-amber-100 text-amber-700",
  General: "bg-slate-100 text-slate-700",
};

type Draft = { id?: string; category: Category; question: string; answer: string; keywords: string };
const blank: Draft = { category: "Wet waste", question: "", answer: "", keywords: "" };

export default function Guidelines({ prefill, clearPrefill }: { prefill: string | null; clearPrefill: () => void }) {
  const [rows, setRows] = useState<Guideline[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | Category>("All");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.guidelines().then(setRows).catch((e) => setToast({ msg: e.message, error: true }));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (prefill) { setDraft({ ...blank, question: prefill }); clearPrefill(); } }, [prefill, clearPrefill]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); } }, [toast]);

  const shown = useMemo(() => rows.filter((r) =>
    (cat === "All" || r.category === cat) &&
    (!q || (r.question + r.answer + r.keywords.join(" ")).toLowerCase().includes(q.toLowerCase()))), [rows, q, cat]);

  async function save() {
    if (!draft) return;
    setBusy(true); setErr("");
    try {
      await api.saveGuideline({ id: draft.id, category: draft.category, question: draft.question, answer: draft.answer, keywords: draft.keywords.split(",").map((k) => k.trim()).filter(Boolean) });
      setDraft(null); await load();
      setToast({ msg: draft.id ? "Guideline updated. Residents will see it within seconds." : "Guideline added. Residents will see it within seconds." });
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function remove(g: Guideline) {
    if (!confirm(`Delete "${g.question}"?\nResidents will no longer see it.`)) return;
    try { await api.deleteGuideline(g.id); await load(); setToast({ msg: "Guideline deleted" }); }
    catch (e) { setToast({ msg: (e as Error).message, error: true }); }
  }

  return (
    <div>
      <PageHeader title="Guidelines & FAQs" sub="The assistant in the resident app answers only from what is written here."
        action={<Button onClick={() => { setErr(""); setDraft(blank); }}><Plus size={16} />New guideline</Button>} />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-60 flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guidelines…" className={`${inputCls} pl-10`} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${cat === c ? "bg-brand-dark text-white" : "bg-surface text-muted hover:bg-brand-soft"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-line">
          {shown.map((g) => (
            <div key={g.id} className="flex items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[g.category]}`}>{g.category}</span>
                  <span className="text-xs text-muted">Updated {fmtDate(g.updatedAt)}</span>
                </div>
                <p className="font-medium">{g.question}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{g.answer}</p>
              </div>
              <div className="flex gap-2">
                <button title="Edit" onClick={() => { setErr(""); setDraft({ id: g.id, category: g.category, question: g.question, answer: g.answer, keywords: g.keywords.join(", ") }); }} className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface"><Pencil size={15} /></button>
                <button title="Delete" onClick={() => remove(g)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="p-10 text-center text-sm text-muted">No guidelines match. Try a different search or add a new one.</p>}
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">{shown.length} of {rows.length} guidelines</p>
      </Card>

      {draft && (
        <Modal title={draft.id ? "Edit guideline" : "New guideline"} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="Category">
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Question" hint="Write it the way a resident would ask it.">
              <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} className={inputCls} placeholder="e.g. Where do old clothes go?" autoFocus />
            </Field>
            <Field label="Answer" hint="Keep it short and practical.">
              <textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} rows={5} className={inputCls} placeholder="Tell residents exactly what to do." />
            </Field>
            <Field label="Keywords (optional)" hint="Comma separated. Words residents might use, like: clothes, textile, cloth.">
              <input value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} className={inputCls} />
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

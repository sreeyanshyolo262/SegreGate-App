import { useEffect, useMemo, useState } from "react";
import { Search, Users, Building2, Clock } from "lucide-react";
import { api, type Resident } from "../api";
import { Card, PageHeader, inputCls } from "../ui";

const ORDER = "ABCDEFGHIJKLMNPQRST".split("");

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};
const label = (b: string) => (b === "Villows" ? "Villows" : `Block ${b}`);

export default function Residents() {
  const [rows, setRows] = useState<Resident[] | null>(null);
  const [err, setErr] = useState("");
  const [block, setBlock] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => { api.residents().then(setRows).catch((e) => setErr(e.message)); }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.block, (m.get(r.block) ?? 0) + 1);
    return m;
  }, [rows]);

  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (block === "All" || r.block === block) && (!q || `${r.block}${r.flat} ${r.block}-${r.flat} ${r.flat}`.toLowerCase().includes(q.toLowerCase()))), [rows, block, q]);

  if (err) return <Card className="p-6 text-red-600">{err}</Card>;
  if (!rows) return <p className="text-muted">Loading…</p>;

  const blocks = [...ORDER, "Villows"].filter((b) => counts.has(b));
  const today = rows.filter((r) => Date.now() - new Date(r.lastSeen).getTime() < 864e5).length;

  return (
    <div>
      <PageHeader title="Residents" sub="Every flat that has signed in to the resident app." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-dark"><Users size={20} /></div>
          <div><p className="text-3xl font-semibold leading-none">{rows.length}</p><p className="mt-1 text-sm text-muted">Flats signed in</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-700"><Building2 size={20} /></div>
          <div><p className="text-3xl font-semibold leading-none">{blocks.length}</p><p className="mt-1 text-sm text-muted">Blocks represented</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700"><Clock size={20} /></div>
          <div><p className="text-3xl font-semibold leading-none">{today}</p><p className="mt-1 text-sm text-muted">Active in the last 24 hours</p></div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a flat, like 1601" className={`${inputCls} pl-10`} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", ...blocks].map((b) => (
              <button key={b} onClick={() => setBlock(b)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${block === b ? "bg-brand-dark text-white" : "bg-surface text-muted hover:bg-brand-soft"}`}>
                {b === "All" ? `All (${rows.length})` : `${b} (${counts.get(b)})`}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">{rows.length === 0 ? "No one has signed in yet. Share the resident app link with residents to get started." : "No flats match."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-5 py-3 font-medium">Flat</th><th className="px-5 py-3 font-medium">Block</th><th className="px-5 py-3 font-medium">First signed in</th><th className="px-5 py-3 font-medium">Last seen</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <tr key={`${r.block}-${r.flat}`} className="hover:bg-surface/60">
                    <td className="px-5 py-3.5 font-semibold">{r.block === "Villows" ? "Villows" : r.block}-{r.flat}</td>
                    <td className="px-5 py-3.5 text-muted">{label(r.block)}</td>
                    <td className="px-5 py-3.5 text-muted">{new Date(r.firstSeen).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3.5"><span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-dark">{ago(r.lastSeen)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-5 py-3 text-xs text-muted">{shown.length} of {rows.length} flats</p>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, BLOCKS, type Block, type Session } from "./api";
import { Card } from "./ui";
import { Mascot } from "./Buddy";

export default function Login({ onDone }: { onDone: (s: Session) => void }) {
  const [block, setBlock] = useState<Block | null>(null);
  const [flat, setFlat] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!block) return setErr("Just pick your block first.");
    if (!/^\d{1,5}$/.test(flat)) return setErr("Just add your flat number, like 1601.");
    setBusy(true); setErr("");
    try {
      await api.login({ block, flat });
      onDone({ block, flat });
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  }

  const letters = BLOCKS.filter((b) => b !== "Villows");

  return (
    <form onSubmit={submit} className="rise px-5 pb-8 pt-5">
      <Card tone="moss" className="relative overflow-hidden p-5">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-butter/25" />
        <div className="absolute -bottom-8 right-10 h-20 w-20 rounded-full bg-leaf/60" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium opacity-80">Ajmera Infinity</p>
            <h1 className="mt-0.5 font-display text-[27px] font-extrabold leading-[1.08]">A little help with your waste</h1>
          </div>
          <div className="shrink-0"><Mascot size={58} /></div>
        </div>
        <p className="relative mt-3 text-sm leading-snug opacity-90">We're all learning to get segregation right. This will help you work out where everyday items belong, without the guesswork.</p>
      </Card>

      <p className="mb-2 mt-5 font-display text-lg font-bold">Which block are you in?</p>
      <div className="grid grid-cols-5 gap-2">
        {letters.map((b) => (
          <button type="button" key={b} onClick={() => { setBlock(b); setErr(""); }}
            className={`press rounded-2xl border-2 border-ink py-2.5 font-display text-lg font-extrabold shadow-[0_3px_0_#12332a] transition ${block === b ? "bg-ink text-butter" : "bg-white"}`}>{b}</button>
        ))}
        <button type="button" onClick={() => { setBlock("Villows"); setErr(""); }}
          className={`press col-span-5 rounded-2xl border-2 border-ink py-2.5 font-display text-lg font-extrabold shadow-[0_3px_0_#12332a] transition ${block === "Villows" ? "bg-ink text-butter" : "bg-mint"}`}>Villows</button>
      </div>

      <p className="mb-2 mt-5 font-display text-lg font-bold">And your flat number?</p>
      <div className="card bg-white px-4 py-1">
        <input value={flat} onChange={(e) => { setFlat(e.target.value.replace(/\D/g, "").slice(0, 5)); setErr(""); }}
          inputMode="numeric" autoComplete="off" placeholder="e.g. 1601"
          className="w-full bg-transparent py-2 font-display text-2xl font-bold tracking-wide outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:opacity-40" />
      </div>

      {err && <p className="rise mt-3 rounded-xl bg-blush px-4 py-2.5 text-sm font-medium">{err}</p>}

      <button disabled={busy}
        className="press card mt-5 flex w-full items-center justify-center gap-2 bg-butter py-3.5 font-display text-lg font-extrabold disabled:opacity-60">
        {busy ? "Just a moment…" : <>Let's get started <ArrowRight size={20} /></>}
      </button>
      <p className="mt-4 text-center text-sm font-medium opacity-75">Small step. Better waste handling for all of us.</p>
      <p className="mt-2 text-center text-xs leading-snug opacity-55">No password needed. The Association can see which flats have joined and what's being asked, so the answers keep improving.</p>
    </form>
  );
}

import { useState } from "react";
import { ArrowRight, Leaf } from "lucide-react";
import { api, BLOCKS, type Block, type Session } from "./api";
import { Card } from "./ui";

export default function Login({ onDone }: { onDone: (s: Session) => void }) {
  const [block, setBlock] = useState<Block | null>(null);
  const [flat, setFlat] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!block) return setErr("Pick your block first");
    if (!/^\d{1,5}$/.test(flat)) return setErr("Enter your flat number, like 1601");
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
    <form onSubmit={submit} className="rise px-5 pb-10 pt-8">
      <Card tone="moss" className="relative overflow-hidden p-6">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-butter/25" />
        <div className="absolute -bottom-8 right-10 h-20 w-20 rounded-full bg-leaf/60" />
        <div className="relative">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border-2 border-white bg-butter text-ink"><Leaf size={24} /></div>
          <p className="text-sm font-medium opacity-80">Welcome to</p>
          <h1 className="font-display text-3xl font-extrabold leading-tight">Ajmera Infinity</h1>
          <p className="mt-1 text-sm opacity-80">Society notices and waste segregation help, all in one place.</p>
        </div>
      </Card>

      <p className="mb-2 mt-7 font-display text-lg font-bold">Your block</p>
      <div className="grid grid-cols-5 gap-2">
        {letters.map((b) => (
          <button type="button" key={b} onClick={() => { setBlock(b); setErr(""); }}
            className={`press rounded-2xl border-2 border-ink py-3 font-display text-lg font-extrabold shadow-[0_3px_0_#12332a] transition ${block === b ? "bg-ink text-butter" : "bg-white"}`}>{b}</button>
        ))}
        <button type="button" onClick={() => { setBlock("Villows"); setErr(""); }}
          className={`press col-span-5 rounded-2xl border-2 border-ink py-3 font-display text-lg font-extrabold shadow-[0_3px_0_#12332a] transition ${block === "Villows" ? "bg-ink text-butter" : "bg-mint"}`}>Villows</button>
      </div>

      <p className="mb-2 mt-7 font-display text-lg font-bold">Your flat number</p>
      <div className="card bg-white px-4 py-1">
        <input value={flat} onChange={(e) => { setFlat(e.target.value.replace(/\D/g, "").slice(0, 5)); setErr(""); }}
          inputMode="numeric" autoComplete="off" placeholder="e.g. 1601"
          className="w-full bg-transparent py-3 font-display text-2xl font-bold tracking-wide outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:opacity-40" />
      </div>

      {err && <p className="rise mt-3 rounded-xl bg-blush px-4 py-2.5 text-sm font-medium">{err}</p>}

      <button disabled={busy}
        className="press card mt-6 flex w-full items-center justify-center gap-2 bg-butter py-4 font-display text-lg font-extrabold disabled:opacity-60">
        {busy ? "Signing in…" : <>Continue <ArrowRight size={20} /></>}
      </button>
      <p className="mt-4 text-center text-xs opacity-60">No password needed. We only use your block and flat to personalise things.</p>
    </form>
  );
}

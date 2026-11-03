import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { api, BLOCKS, type Block, type Session } from "./api";
import { Card } from "./ui";
import { Mascot } from "./Buddy";

const BLOCKS_HELP = "Blocks are A to T (there's no O), or V for Villows.";

// Reads a flat however it's typed: M1601, m-1601, M 1601, 1601 M, Block M flat 1601, V12, Villows 12.
export function readFlat(raw: string): { block: Block; flat: string } | { problem: string } {
  const text = raw.toUpperCase().replace(/\b(BLOCK|FLAT|NO|NUMBER)\b/g, "").replace(/[^A-Z0-9]/g, "");
  if (!text) return { problem: "Just type your block and flat, like M-1601." };
  if (/^\d+$/.test(text)) return { problem: "Just add your block letter too, like M-1601." };
  if (/^[A-Z]+$/.test(text)) return { problem: "Just add your flat number too, like M-1601." };

  const parts = text.match(/^([A-Z]+)(\d{1,5})$/) ?? text.match(/^(\d{1,5})([A-Z]+)$/);
  if (!parts) return { problem: "Try typing it like M-1601." };
  const [word, flat] = /\d/.test(parts[1]) ? [parts[2], parts[1]] : [parts[1], parts[2]];

  if (/^(V|VILLOWS?|WILLOWS?)$/.test(word)) return { block: "Villows", flat };
  if ((BLOCKS as readonly string[]).includes(word)) return { block: word as Block, flat };
  return { problem: `We couldn't find block ${word}. ${BLOCKS_HELP}` };
}

export default function Login({ onDone }: { onDone: (s: Session) => void }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const read = readFlat(value);
  const found = "block" in read ? read : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!found) return setErr("problem" in read ? read.problem : "");
    setBusy(true); setErr("");
    try {
      await api.login(found);
      onDone(found);
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  }

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

      <label htmlFor="flat" className="mt-7 block font-display text-xl font-extrabold">What's your flat?</label>
      <input id="flat" value={value} onChange={(e) => { setValue(e.target.value); setErr(""); }} maxLength={30}
        autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" placeholder="e.g. M-1601"
        className="mt-3 h-14 w-full rounded-2xl border-2 border-ink/25 bg-white px-4 font-display text-xl font-bold outline-none transition placeholder:font-sans placeholder:text-lg placeholder:font-normal placeholder:text-ink/40 focus:border-ink" />

      <div className="mt-2 flex min-h-6 items-center text-sm" aria-live="polite">
        {found
          ? <p className="rise flex items-center gap-1.5 font-bold text-leaf"><Check size={16} strokeWidth={3} />{found.block === "Villows" ? "Villows" : `Block ${found.block}`} · Flat {found.flat}</p>
          : <p className="opacity-60">Your block, then your flat. Villows? Try V-12.</p>}
      </div>

      {err && <p className="rise mt-2 rounded-xl bg-peach px-4 py-2.5 text-sm font-medium">{err}</p>}

      <button disabled={busy}
        className="press card mt-4 flex w-full items-center justify-center gap-2 bg-butter py-3.5 font-display text-lg font-extrabold disabled:opacity-60">
        {busy ? "Just a moment…" : <>Let's get started <ArrowRight size={20} /></>}
      </button>
      <p className="mt-4 text-center text-sm font-medium opacity-75">Small step. Better waste handling for all of us.</p>
      <p className="mt-2 text-center text-xs leading-snug opacity-55">No password needed. The Association can see which flats have joined and what's being asked, so the answers keep improving.</p>
    </form>
  );
}

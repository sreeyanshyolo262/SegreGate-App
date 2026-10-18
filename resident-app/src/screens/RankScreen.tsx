import { useState } from "react";
import { Header } from "../ui";
import { flats, blocks, societies } from "../data";

const BOARDS = { Flats: flats, Blocks: blocks, Societies: societies } as const;
type Board = keyof typeof BOARDS;
const MEDAL = ["🥇", "🥈", "🥉"];

export default function RankScreen() {
  const [tab, setTab] = useState<Board>("Flats");
  const rows = BOARDS[tab] as readonly { name: string; pts: number; me?: boolean }[];
  const max = Math.max(...rows.map((r) => r.pts));

  return (
    <div>
      <Header sub="Scored per household" title="Leaderboard" />
      <div className="space-y-4 px-5">
        <div className="card flex bg-white p-1.5">
          {(Object.keys(BOARDS) as Board[]).map((b) => (
            <button key={b} onClick={() => setTab(b)}
              className={`flex-1 rounded-2xl py-2 text-sm font-bold transition ${tab === b ? "bg-ink text-white" : ""}`}>{b}</button>
          ))}
        </div>

        <div className="card bg-butter p-4">
          <p className="font-display text-lg font-bold">🔥 Week 42 challenge</p>
          <p className="text-sm">No plastic in wet waste. Block B is 310 pts behind Block A.</p>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.name} className={`card relative overflow-hidden p-3.5 ${r.me ? "bg-mint" : "bg-white"}`}>
              <div className="absolute inset-y-0 left-0 bg-leaf/10" style={{ width: `${(r.pts / max) * 100}%` }} />
              <div className="relative flex items-center gap-3">
                <span className="w-8 text-center font-display text-xl font-extrabold">{MEDAL[i] ?? i + 1}</span>
                <p className="flex-1 font-bold">{r.name}{r.me && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] text-white">YOU</span>}</p>
                <p className="font-display font-extrabold">{r.pts.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="pb-2 text-center text-xs opacity-60">Points = collector bin checks per household</p>
      </div>
    </div>
  );
}

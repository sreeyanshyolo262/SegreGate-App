import { MapPin, Gift } from "lucide-react";
import { Card, Header } from "../ui";
import { resident, badges } from "../data";

export default function ProfileScreen() {
  const r = resident;
  const ranks: [string, number][] = [["Flat", r.rank.flat], ["Block", r.rank.block], ["City", r.rank.city]];
  return (
    <div>
      <Header sub="Your household" title="Profile" />
      <div className="space-y-4 px-5">
        <Card tone="moss" className="flex items-center gap-4 p-4">
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-butter font-display text-2xl font-extrabold text-ink">
            {r.name.split(" ").map((w) => w[0]).join("")}
          </div>
          <div>
            <p className="font-display text-xl font-bold">{r.name}</p>
            <p className="flex items-center gap-1 text-sm opacity-80"><MapPin size={13} />{r.society}, {r.city}</p>
            <p className="text-sm opacity-80">Flat {r.flat} · {r.block}</p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {ranks.map(([l, v]) => (
            <Card key={l} tone="peach" className="p-3 text-center">
              <p className="font-display text-2xl font-extrabold">#{v}</p>
              <p className="text-xs font-medium opacity-70">{l}</p>
            </Card>
          ))}
        </div>

        <div>
          <p className="mb-2 font-display text-lg font-bold">Badges</p>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => (
              <Card key={b.name} tone={b.got ? "butter" : "white"} className={`p-3 text-center ${b.got ? "" : "opacity-50"}`}>
                <div className={`text-3xl ${b.got ? "" : "grayscale"}`}>{b.emoji}</div>
                <p className="mt-1 text-[11px] font-bold leading-tight">{b.name}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card tone="sky" className="flex items-center gap-3 p-4">
          <Gift />
          <div>
            <p className="text-sm font-bold">Reward: 5% maintenance discount</p>
            <p className="text-xs opacity-70">Unlock at 2,000 pts. You are 160 away.</p>
          </div>
        </Card>
        <div className="h-2" />
      </div>
    </div>
  );
}

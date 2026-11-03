import type { BinId } from "./api";

export const BIN_INFO: Record<BinId, { label: string; short: string; where: string; tone: string }> = {
  wet: { label: "Wet waste", short: "Wet", where: "Green bin, or any bin with a green mark", tone: "bg-mint" },
  dry: { label: "Dry waste", short: "Dry", where: "Any reusable bag or bin", tone: "bg-sky" },
  reject: { label: "Sanitary / reject waste", short: "Reject", where: "Red bin, or any bin with a red mark", tone: "bg-blush" },
  hazardous: { label: "Hazardous waste", short: "Hazard", where: "Hand over separately, not in a bin", tone: "bg-butter" },
};
const ORDER: BinId[] = ["wet", "dry", "reject", "hazardous"];
const INK = "#12332a";

function WheelieBin({ body, lid, children }: { body: string; lid: string; children: React.ReactNode }) {
  return (
    <>
      <circle className="bin-drop" cx="32" cy="10" r="5" fill="#fa9a4b" stroke={INK} strokeWidth="2.5" />
      <path d="M13 25h38l-3.8 39.5a5 5 0 0 1-5 4.5H21.8a5 5 0 0 1-5-4.5z" fill={body} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {children}
      <g className="bin-lid">
        <path d="M26 16v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" fill="none" stroke={INK} strokeWidth="3" />
        <rect x="9" y="16" width="46" height="9" rx="4.5" fill={lid} stroke={INK} strokeWidth="3" />
      </g>
    </>
  );
}

// Drawn from the society's poster: a green bin with a tick, a reusable bag, a red bin with a cross, and a hand-over box.
export function BinArt({ bin, size = 44 }: { bin: BinId; size?: number }) {
  return (
    <svg width={size} height={size * 1.125} viewBox="0 0 64 72" aria-hidden="true" className="block overflow-visible">
      {bin === "wet" && (
        <WheelieBin body="#57bd7c" lid="#2f9e5a">
          <circle cx="32" cy="46" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M26.5 46.5l4 4 7.5-9" fill="none" stroke="#1f7a4a" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </WheelieBin>
      )}
      {bin === "reject" && (
        <WheelieBin body="#ee7d76" lid="#d9534d">
          <circle cx="32" cy="46" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M27.5 41.5l9 9m0-9l-9 9" fill="none" stroke="#c9403a" strokeWidth="3.6" strokeLinecap="round" />
        </WheelieBin>
      )}
      {bin === "dry" && (
        <>
          <circle className="bin-drop" cx="32" cy="6" r="5" fill="#fa9a4b" stroke={INK} strokeWidth="2.5" />
          <path d="M22 28v-9a10 10 0 0 1 20 0v9" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M11 27h42l3 37a5 5 0 0 1-5 5.4H13a5 5 0 0 1-5-5.4z" fill="#8cbcf4" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="32" cy="48" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M25.6 46.4a6.8 6.8 0 0 1 11.6-3.2l1.5 1.6m0-4.2v4.2h-4.2M38.4 49.6a6.8 6.8 0 0 1-11.6 3.2l-1.5-1.6m0 4.2v-4.2h4.2" fill="none" stroke="#2f6fd6" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {bin === "hazardous" && (
        <>
          <path d="M10 27l7-11h30l7 11z" fill="#5a6d66" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="10" y="27" width="44" height="42" rx="5" fill="#3f514b" stroke={INK} strokeWidth="3" />
          <path d="M32 35l12.5 22h-25z" fill="#f5c518" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 43v6.5" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="53.2" r="1.7" fill={INK} />
        </>
      )}
    </svg>
  );
}

// All four streams side by side, with the right one lit up, so the answer is clear at a glance.
export function BinRow({ active, captions }: { active: BinId[]; captions?: Partial<Record<BinId, string>> }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="img" aria-label={`Goes in: ${active.map((b) => BIN_INFO[b].label).join(" or ")}`}>
      {ORDER.map((b) => {
        const on = active.includes(b);
        return (
          <div key={b} className={`flex flex-col items-center rounded-2xl border-2 px-0.5 pb-1.5 pt-2 transition ${on ? `bin-on border-ink ${BIN_INFO[b].tone} shadow-[0_3px_0_#12332a]` : "border-ink/10 bg-white opacity-45 grayscale-[.7]"}`}>
            <BinArt bin={b} size={40} />
            <span className={`mt-1 text-[11px] leading-tight ${on ? "font-extrabold" : "font-medium"}`}>{BIN_INFO[b].short}</span>
            {on && captions?.[b] && <span className="mt-0.5 text-center text-[10px] font-medium leading-tight opacity-75">{captions[b]}</span>}
          </div>
        );
      })}
    </div>
  );
}

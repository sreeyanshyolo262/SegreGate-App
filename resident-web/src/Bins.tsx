import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { BinId } from "./api";

export const BIN_INFO: Record<BinId, { label: string; short: string; where: string; tone: string }> = {
  wet: { label: "Wet waste", short: "Wet", where: "Green bin, or any bin with a green mark", tone: "bg-mint" },
  dry: { label: "Dry waste", short: "Dry", where: "Any reusable bag or bin", tone: "bg-sky" },
  reject: { label: "Sanitary / reject waste", short: "Reject", where: "Red bin, or any bin with a red mark", tone: "bg-blush" },
  hazardous: { label: "Hazardous waste", short: "Hazard", where: "Hand over separately, not in a bin", tone: "bg-butter" },
};
export const ORDER: BinId[] = ["wet", "dry", "reject", "hazardous"];
const INK = "#12332a";
const FACE_Y: Record<BinId, number> = { wet: 47, dry: 50, reject: 47, hazardous: 49 };

// What's printed on the front of each one, from the society's poster: a tick, a recycling mark, a cross and a warning sign.
function Face({ bin }: { bin: BinId }) {
  if (bin === "hazardous") {
    return (
      <>
        <path d="M32 35l12.5 22h-25z" fill="#f5c518" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M32 43v6.5" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="53.2" r="1.7" fill={INK} />
      </>
    );
  }
  return (
    <>
      <circle cx="32" cy={FACE_Y[bin]} r="10.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
      {bin === "wet" && <path d="M26.5 47.5l4 4 7.5-9" fill="none" stroke="#1f7a4a" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />}
      {bin === "reject" && <path d="M27.5 42.5l9 9m0-9l-9 9" fill="none" stroke="#c9403a" strokeWidth="3.6" strokeLinecap="round" />}
      {bin === "dry" && <path d="M25.6 48.4a6.8 6.8 0 0 1 11.6-3.2l1.5 1.6m0-4.2v4.2h-4.2M38.4 51.6a6.8 6.8 0 0 1-11.6 3.2l-1.5-1.6m0 4.2v-4.2h4.2" fill="none" stroke="#2f6fd6" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />}
    </>
  );
}

const Ground = () => <ellipse cx="32" cy="69" rx="23.5" ry="2.7" fill={INK} opacity=".16" />;

// Lit from the left with a shadow underneath, so they read as little 3D toys rather than flat icons.
function WheelieBin({ body, shade, lid, rim, children }: { body: string; shade: string; lid: string; rim: string; children: ReactNode }) {
  return (
    <>
      <Ground />
      <ellipse cx="21" cy="64.5" rx="4.4" ry="4.6" fill={INK} />
      <ellipse cx="43" cy="64.5" rx="4.4" ry="4.6" fill={INK} />
      <ellipse cx="32" cy="23" rx="21" ry="6" fill={INK} />
      <circle className="bin-drop" cx="32" cy="8" r="5" fill="#fa9a4b" stroke={INK} strokeWidth="2.5" />
      <path d="M11 23Q32 35 53 23L48 60.5Q32 68.5 16 60.5z" fill={body} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M45 34L51.5 30.5L47 59.6Q43.5 61.8 39.5 63z" fill={shade} />
      <path d="M12.3 27.5Q32 38 51.7 27.5L51 32.5Q32 43 13 32.5z" fill={shade} />
      <path d="M19.5 38.5L21.6 56" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      {children}
      <g className="bin-lid">
        <path d="M7 18v4.6c0 4 11.2 7.2 25 7.2s25-3.2 25-7.2V18" fill={rim} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="32" cy="18" rx="25" ry="7.2" fill={lid} stroke={INK} strokeWidth="3" />
        <path d="M25 17c0-5.6 3-8 7-8s7 2.4 7 8" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M13.5 16.5c2.6-1.7 6-2.8 9.5-3.3" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  );
}

function ToteBag({ children }: { children: ReactNode }) {
  return (
    <>
      <Ground />
      <ellipse cx="32" cy="28" rx="22" ry="5" fill="#4f7fc0" stroke={INK} strokeWidth="2.5" />
      <path d="M25 27v-8a7 7 0 0 1 14 0v8" fill="none" stroke={INK} strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
      <circle className="bin-drop" cx="32" cy="6" r="5" fill="#fa9a4b" stroke={INK} strokeWidth="2.5" />
      <path d="M10 28Q32 38 54 28L57.4 62.4a5 5 0 0 1-5 5.6Q32 70.6 11.6 68a5 5 0 0 1-5-5.6z" fill="#8cbcf4" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M47.5 36L54.6 32.2L56.9 62.4a4 4 0 0 1-4 4.5L45 68z" fill="#6ea3e3" />
      <path d="M14.2 40L12.8 60" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
      <path d="M20.5 33.5V20a11.5 11.5 0 0 1 23 0v13.5" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {children}
    </>
  );
}

function Crate({ children }: { children: ReactNode }) {
  return (
    <>
      <Ground />
      <path d="M9 28L17 15H47L55 28z" fill="#7d9189" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 15V28" stroke={INK} strokeOpacity=".5" strokeWidth="2" />
      <rect x="9" y="28" width="46" height="40" rx="4" fill="#4f635c" stroke={INK} strokeWidth="3" />
      <path d="M46 29.5h7.5v35a2 2 0 0 1-2 2H46z" fill="#3f514b" />
      <path d="M13.5 33.5h27" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.5" strokeLinecap="round" />
      {children}
    </>
  );
}

export function BinArt({ bin, size = 44, face = true }: { bin: BinId; size?: number; face?: boolean }) {
  const print = face ? <Face bin={bin} /> : null;
  return (
    <svg width={size} height={size * 1.125} viewBox="0 0 64 72" aria-hidden="true" className="block overflow-visible">
      {bin === "wet" && <WheelieBin body="#57bd7c" shade="#3fa565" lid="#3fb26b" rim="#258a4d">{print}</WheelieBin>}
      {bin === "reject" && <WheelieBin body="#ee7d76" shade="#d9615a" lid="#e8655f" rim="#c2453f">{print}</WheelieBin>}
      {bin === "dry" && <ToteBag>{print}</ToteBag>}
      {bin === "hazardous" && <Crate>{print}</Crate>}
    </svg>
  );
}

// The same print on its own, so it can slide around the bin as the bin turns.
export function BinFace({ bin, size }: { bin: BinId; size: number }) {
  const width = (size * 28) / 64, top = FACE_Y[bin] - 14;
  return (
    <span className="bin-print absolute left-1/2 block" style={{ width, height: width, marginLeft: -width / 2, top: (top * size) / 64 }}>
      <svg width={width} height={width} viewBox={`18 ${top} 28 28`} aria-hidden="true" className="block overflow-visible"><Face bin={bin} /></svg>
    </span>
  );
}

// While an answer is on its way, the four bins take turns hopping.
export function BinWave() {
  return (
    <div className="bin-wave flex justify-around" aria-hidden="true">
      {ORDER.map((b, i) => <span key={b} style={{ "--i": i } as CSSProperties}><BinArt bin={b} size={26} /></span>)}
    </div>
  );
}

// Four bins circling whatever's in the middle, passing in front of it and behind it. The graphics chip does all the work.
export function BinOrbit({ size = 40, fast = false, children }: { size?: number; fast?: boolean; children: ReactNode }) {
  const orbit = useRef<HTMLDivElement>(null);
  useEffect(() => {
    orbit.current?.getAnimations({ subtree: true }).forEach((a) => a.updatePlaybackRate(fast ? 3.2 : 1));
  }, [fast]);
  return (
    <div className="orbit-stage" aria-hidden="true">
      <div ref={orbit} className="orbit">
        <div className="orbit-spin">
          {ORDER.map((b, i) => (
            <div key={b} className="orbit-arm" style={{ "--a": `${i * 90}deg` } as CSSProperties}>
              <div className="orbit-toy" style={{ marginLeft: -size / 2, marginTop: -size * 0.56 }}><BinArt bin={b} size={size} /></div>
            </div>
          ))}
        </div>
        <div className="orbit-center">{children}</div>
      </div>
    </div>
  );
}

// All four streams side by side, with the right one lit up, so the answer is clear at a glance.
export function BinRow({ active, captions }: { active: BinId[]; captions?: Partial<Record<BinId, string>> }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="img" aria-label={`Goes in: ${active.map((b) => BIN_INFO[b].label).join(" or ")}`}>
      {ORDER.map((b, i) => {
        const on = active.includes(b);
        return (
          <div key={b} style={{ "--i": i } as CSSProperties} className={`relative flex flex-col items-center rounded-2xl border-2 border-ink/10 bg-white px-0.5 pb-1.5 pt-2 ${on ? "bin-on" : "bin-off"}`}>
            {on && <span className={`bin-glow ${BIN_INFO[b].tone}`} />}
            <span className="relative">
              <BinArt bin={b} size={40} />
              {on && <span className="bin-puff" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
            </span>
            <span className={`relative mt-1 text-[11px] leading-tight ${on ? "font-extrabold" : "font-medium"}`}>{BIN_INFO[b].short}</span>
            {on && captions?.[b] && <span className="relative mt-0.5 text-center text-[10px] font-medium leading-tight opacity-75">{captions[b]}</span>}
          </div>
        );
      })}
    </div>
  );
}

import type { ReactNode } from "react";

export const tones = {
  mint: "bg-mint",
  peach: "bg-peach",
  sky: "bg-sky",
  butter: "bg-butter",
  blush: "bg-blush",
  white: "bg-white",
  moss: "bg-moss text-white",
} as const;
export type Tone = keyof typeof tones;

export function Card({ tone = "white", className = "", children, onClick }: { tone?: Tone; className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`card ${tones[tone]} ${onClick ? "press cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Header({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 pt-6 pb-3">
      <div>
        {sub && <p className="text-sm font-medium opacity-60">{sub}</p>}
        <h1 className="font-display text-[28px] font-extrabold leading-tight">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function Ring({ value, size = 110, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#12332a22" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f7a4a" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

import { useRef } from "react";
import { BinArt } from "./Bins";
import { useOnScreen } from "./motion";

const INK = "#12332a";
const TOWERS = [
  { x: 6, w: 46, h: 62, front: "#d4f6d9", side: "#a9e3b4", top: "#eafbe9" },
  { x: 64, w: 38, h: 90, front: "#d3e6ff", side: "#a9c9f2", top: "#e9f2ff" },
  { x: 114, w: 52, h: 54, front: "#fff3b0", side: "#f1dc7e", top: "#fff9d6" },
  { x: 178, w: 40, h: 98, front: "#ffe2d4", side: "#f6bfa6", top: "#fff0e9" },
  { x: 230, w: 48, h: 68, front: "#d4f6d9", side: "#a9e3b4", top: "#eafbe9" },
  { x: 290, w: 38, h: 86, front: "#d3e6ff", side: "#a9c9f2", top: "#e9f2ff" },
  { x: 340, w: 46, h: 58, front: "#fff3b0", side: "#f1dc7e", top: "#fff9d6" },
];

function Towers() {
  return (
    <svg viewBox="0 0 400 104" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className="absolute inset-x-0 bottom-[30px] block h-[104px] w-full">
      {TOWERS.map(({ x, w, h, front, side, top }) => {
        const y = 104 - h;
        // Rows of windows, drawn as a dashed line for each column.
        const windows = Array.from({ length: Math.floor((w - 8) / 11) }, (_, i) => `M${x + 9 + i * 11} ${y + 7}V104`).join("");
        return (
          <g key={x} stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
            <path d={`M${x + w} ${y}l11-7v${h + 7}h-11z`} fill={side} />
            <path d={`M${x} ${y}l11-7h${w}l-11 7z`} fill={top} />
            <rect x={x} y={y} width={w} height={h + 2} fill={front} />
            <path d={windows} fill="none" stroke={INK} strokeOpacity=".28" strokeWidth="5" strokeDasharray="5 6" />
          </g>
        );
      })}
    </svg>
  );
}

function Wheel({ left }: { left: number }) {
  return (
    <span className="truck-wheel" style={{ left }}>
      <svg width="17" height="17" viewBox="0 0 17 17" className="block">
        <circle cx="8.5" cy="8.5" r="8" fill={INK} />
        <circle cx="8.5" cy="8.5" r="3.6" fill="#fff" />
        <path d="M8.5 5v7" stroke={INK} strokeWidth="1.8" />
      </svg>
    </span>
  );
}

// The foot of the page: the collection truck doing its rounds past the towers, picking up bins as it goes.
export default function TruckScene() {
  const scene = useRef<HTMLDivElement>(null);
  useOnScreen(scene, (on) => scene.current?.classList.toggle("is-on", on));
  return (
    <div className="mt-10">
      <p className="text-center text-sm font-medium opacity-70">Small step. Better waste handling for all of us.</p>
      <div ref={scene} aria-hidden="true" className="truck-scene">
        <Towers />
        <span className="road" />
        <span className="truck">
          <span className="truck-puff" />
          <span className="truck-puff" />
          <span className="truck-body">
            <svg width="96" height="55" viewBox="0 0 84 48" className="block overflow-visible">
              <path d="M3 8a3 3 0 0 1 3-3h44a3 3 0 0 1 3 3v29H3z" fill="#57bd7c" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
              <path d="M41 6.4h10.7V35.6H41z" fill="#3fa565" />
              <path d="M8.4 11v19" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="26" cy="21" r="9.5" fill="#fff" stroke={INK} strokeWidth="2.2" />
              <path d="M21.5 21.5l3 3 6.2-7.2" fill="none" stroke="#1f7a4a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M55 15h11a3 3 0 0 1 2.4 1.2l8 10.6a3 3 0 0 1 .6 1.8V37H55z" fill="#fff3b0" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
              <path d="M60 19h6l5.5 7.5H60z" fill="#d3e6ff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M2 37h76" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
            </svg>
            <Wheel left={11} />
            <Wheel left={67} />
          </span>
        </span>
        <span className="road-bin road-bin-a"><BinArt bin="wet" size={25} /></span>
        <span className="road-bin road-bin-b"><BinArt bin="reject" size={25} /></span>
      </div>
    </div>
  );
}

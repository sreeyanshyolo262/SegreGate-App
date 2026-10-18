import { useEffect, useRef, useState } from "react";
import { Camera, Search, RotateCcw, Lightbulb, ThumbsDown } from "lucide-react";
import { Card, Header } from "../ui";
import { BINS } from "../data";
import { classify, type Classification } from "../classify";

const QUICK = ["Banana peel", "Plastic bottle", "Used tissue", "Pizza box", "Battery", "Tea bag"];
const CORNERS = [
  "top-3 left-3 border-t-4 border-l-4",
  "top-3 right-3 border-t-4 border-r-4",
  "bottom-3 left-3 border-b-4 border-l-4",
  "bottom-3 right-3 border-b-4 border-r-4",
];

export default function ScanScreen() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Classification | null>(null);
  const [question, setQuestion] = useState("");
  const [unknown, setUnknown] = useState(false);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    if (camOn && video.current) video.current.srcObject = stream.current;
  }, [camOn]);

  async function startCam() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCamErr("");
      setCamOn(true);
    } catch {
      setCamErr("Camera unavailable. Type the item below instead.");
    }
  }

  async function run(item: string) {
    if (!item.trim()) return;
    setBusy(true); setResult(null); setQuestion(""); setUnknown(false);
    const r = await classify(item);
    setBusy(false);
    if (!r) setUnknown(true);
    else if ("question" in r) setQuestion(r.question);
    else setResult(r);
  }

  const reset = () => { setResult(null); setQuestion(""); setUnknown(false); setText(""); };
  const bin = result ? BINS[result.bin] : null;

  return (
    <div>
      <Header sub="Find the right bin" title="Scan an item" />
      <div className="space-y-4 px-5">
        <div className="card relative aspect-[4/3] overflow-hidden bg-moss">
          {camOn ? (
            <>
              <video ref={video} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="scanline absolute left-4 right-4 h-0.5 bg-butter shadow-[0_0_12px_#fff3b0]" />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
              <Camera size={40} />
              <button onClick={startCam} className="press rounded-full border-2 border-ink bg-butter px-5 py-2 text-sm font-bold text-ink shadow-[0_3px_0_#12332a]">
                Open camera
              </button>
              {camErr && <p className="px-6 text-center text-xs opacity-80">{camErr}</p>}
            </div>
          )}
          {CORNERS.map((c) => (
            <span key={c} className={`absolute h-7 w-7 rounded-md border-butter ${c}`} />
          ))}
        </div>
        {camOn && (
          <p className="-mt-2 text-center text-xs opacity-60">
            Image recognition arrives with the ML phase. For now, name what you see below.
          </p>
        )}

        <form onSubmit={(e) => { e.preventDefault(); run(text); }} className="card flex items-center gap-2 bg-white px-4 py-2">
          <Search size={18} className="opacity-50" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. greasy pizza box"
            className="flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:opacity-40" />
          <button className="press rounded-xl bg-ink px-3.5 py-1.5 text-sm font-bold text-white">Check</button>
        </form>

        {!result && !busy && (
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} onClick={() => { setText(q); run(q); }}
                className="press rounded-full border-2 border-ink bg-white px-3 py-1 text-sm font-medium shadow-[0_2px_0_#12332a]">{q}</button>
            ))}
          </div>
        )}

        {busy && <Card className="p-5 text-center text-sm font-medium">Checking the rulebook…</Card>}

        {bin && result && (
          <div className="rise space-y-3">
            <div className="card p-5" style={{ background: bin.bg }}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">{result.title}</p>
              <p className="mt-1 flex items-center gap-2 font-display text-3xl font-extrabold" style={{ color: bin.color }}>
                <span>{bin.emoji}</span>{bin.label}
              </p>
              <p className="text-sm font-medium opacity-70">{bin.sub}</p>
              <p className="mt-3 text-[15px] leading-snug">{result.reason}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full" style={{ width: `${result.confidence * 100}%`, background: bin.color }} />
              </div>
              <p className="mt-1 text-[11px] opacity-60">{Math.round(result.confidence * 100)}% confidence · {result.source === "api" ? "AI model" : "local rules"}</p>
            </div>
            {result.tip && (
              <Card tone="butter" className="flex gap-3 p-3.5">
                <Lightbulb size={20} className="shrink-0" />
                <p className="text-sm font-medium">{result.tip}</p>
              </Card>
            )}
            <div className="flex gap-3">
              <button onClick={reset} className="card press flex flex-1 items-center justify-center gap-2 bg-white py-3 font-bold"><RotateCcw size={16} />Scan another</button>
              <button className="card press flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-bold"><ThumbsDown size={16} />Wrong?</button>
            </div>
          </div>
        )}

        {question && (
          <Card tone="sky" className="rise p-4">
            <p className="text-sm font-bold">Need one more detail</p>
            <p className="mt-1 text-sm">{question}</p>
          </Card>
        )}
        {unknown && (
          <Card tone="peach" className="rise p-4">
            <p className="text-sm font-bold">Not sure about that one</p>
            <p className="mt-1 text-sm">Try a simpler name, or ask the chat assistant.</p>
          </Card>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

import { memo, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { AnswerData, Source } from "./api";
import { BIN_INFO, BinArt, BinRow } from "./Bins";
import Linkified from "./Linkified";

const NUMBER_TONES = ["bg-sky", "bg-mint", "bg-peach", "bg-butter", "bg-blush"];
const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// The sentence settles in word by word, so the answer feels written rather than dropped in.
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  if (words.length > 30) return <>{text}</>;
  return <>{words.map((w, i) => <span key={i}><span className="word" style={{ "--i": i + 6 } as CSSProperties}>{w}</span>{" "}</span>)}</>;
}

function Note({ children, label = "One thing to keep in mind" }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex gap-2.5 rounded-2xl bg-butter/70 p-3 text-sm leading-snug">
      <Lightbulb size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{label}</p>
        <div className="mt-0.5 [overflow-wrap:anywhere]">{children}</div>
      </div>
    </div>
  );
}

function BinCard({ card }: { card: Extract<AnswerData, { type: "bin" }> }) {
  const depends = card.variants.length > 1;
  const active = depends ? card.variants.map((v) => v.bin) : [card.bin];
  const info = BIN_INFO[card.bin];

  return (
    <>
      <div className={`px-4 pb-3.5 pt-4 ${depends ? "bg-butter" : info.tone}`}>
        {card.item && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <p className="text-xs font-bold uppercase tracking-wider opacity-60">{card.item}</p>
            {card.countsAs && <p className="counts-as flex min-w-0 items-center gap-1 rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-bold leading-tight"><ArrowRight size={11} strokeWidth={3} className="counts-arrow shrink-0" /><span className="min-w-0">counts as {card.countsAs}</span></p>}
          </div>
        )}
        <p className="mt-0.5 font-display text-[25px] font-extrabold leading-[1.1]">{depends ? "It depends on its condition" : info.label}</p>
        {!depends && <p className="mt-1 text-sm font-medium leading-snug opacity-75">{info.where}</p>}
      </div>
      <div className="cascade space-y-3 p-3.5">
        <BinRow active={active} />
        {depends && (
          <ul className="space-y-2">
            {card.variants.map((v) => (
              <li key={v.when} className={`flex items-center gap-3 rounded-2xl p-2.5 ${BIN_INFO[v.bin].tone}`}>
                <BinArt bin={v.bin} size={30} />
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-bold">{sentence(v.when)}</p>
                  <p className="text-[13px] opacity-75">{BIN_INFO[v.bin].label}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!depends && <p className="text-[15px] leading-snug"><Words text={sentence(card.say)} /></p>}
        {card.tips.length > 0 && (
          <Note label={card.tips.length > 1 ? "Quick tips" : "A quick tip"}>
            {card.tips.length > 1 ? <ul className="list-disc space-y-0.5 pl-4">{card.tips.map((t) => <li key={t}>{sentence(t)}</li>)}</ul> : sentence(card.tips[0])}
          </Note>
        )}
      </div>
    </>
  );
}

function Title({ children }: { children: ReactNode }) {
  return children ? <p className="font-display text-xl font-extrabold leading-tight">{children}</p> : null;
}

function ListCard({ card }: { card: Extract<AnswerData, { type: "list" }> }) {
  const info = card.bin ? BIN_INFO[card.bin] : null;
  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3.5 ${info ? info.tone : "bg-sky"}`}>
        {card.bin && <span className="shrink-0"><BinArt bin={card.bin} size={40} /></span>}
        <div className="min-w-0">
          <Title>{card.title}</Title>
          {info && <p className="mt-0.5 text-[13px] font-medium leading-snug opacity-75">{info.where}</p>}
        </div>
      </div>
      <div className="space-y-3.5 p-3.5">
        {card.groups.map((g, i) => (
          <div key={g.label || i}>
            {g.label && <p className="mb-1.5 text-xs font-bold uppercase tracking-wider opacity-60">{g.label}</p>}
            <ul className="flex flex-wrap gap-1.5">
              {g.items.map((item, n) => <li key={item} style={{ "--i": n } as CSSProperties} className="pop-item rounded-full border-[1.5px] border-ink/25 bg-cream px-2.5 py-1 text-[13px] font-medium leading-tight">{sentence(item)}</li>)}
            </ul>
          </div>
        ))}
        {card.note && <Note>{card.note}</Note>}
      </div>
    </>
  );
}

function StepsCard({ card }: { card: Extract<AnswerData, { type: "steps" }> }) {
  return (
    <div className="space-y-3 p-4">
      <Title>{card.title}</Title>
      <ol className="cascade space-y-2.5">
        {card.steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-[15px] leading-snug">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink font-display text-[13px] font-extrabold ${NUMBER_TONES[i % NUMBER_TONES.length]}`}>{i + 1}</span>
            <span className="min-w-0 pt-0.5 [overflow-wrap:anywhere]"><Linkified text={sentence(s)} pill /></span>
          </li>
        ))}
      </ol>
      {card.note && <Note>{card.note}</Note>}
    </div>
  );
}

function TableCard({ card }: { card: Extract<AnswerData, { type: "table" }> }) {
  return (
    <div className="space-y-3 p-4">
      <Title>{card.title}</Title>
      <div className="overflow-x-auto rounded-2xl border-2 border-ink">
        <table className="w-full border-collapse text-left text-sm leading-snug">
          <thead className="bg-moss text-white">
            <tr>{card.columns.map((c) => <th key={c} scope="col" className="px-3 py-2 font-bold">{c}</th>)}</tr>
          </thead>
          <tbody className="cascade">
            {card.rows.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-cream" : "bg-white"}>
                {r.map((cell, j) => (j === 0 ? <th key={j} scope="row" className="px-3 py-2 align-top font-bold">{cell}</th> : <td key={j} className="px-3 py-2 align-top">{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {card.note && <Note>{card.note}</Note>}
    </div>
  );
}

function FactCard({ card }: { card: Extract<AnswerData, { type: "fact" }> }) {
  return (
    <>
      {card.highlight && (
        <div className="bg-mint px-4 py-3.5">
          {card.title && <p className="text-xs font-bold uppercase tracking-wider opacity-60">{card.title}</p>}
          <p className="pop-soft mt-0.5 font-display text-[28px] font-extrabold leading-[1.1]" style={{ transformOrigin: "0 50%" }}>{card.highlight}</p>
        </div>
      )}
      {(card.points.length > 0 || !card.highlight) && (
        <div className="space-y-2.5 p-4">
          {!card.highlight && <Title>{card.title}</Title>}
          {card.points.length === 1
            ? <p className="text-[15px] leading-snug [overflow-wrap:anywhere]"><Linkified text={sentence(card.points[0])} pill /></p>
            : (
              <ul className="cascade space-y-2">
                {card.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[15px] leading-snug">
                    <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full border-[1.5px] border-ink bg-butter" />
                    <span className="min-w-0 [overflow-wrap:anywhere]"><Linkified text={sentence(p)} pill /></span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </>
  );
}

const shortDate = (day: string) => {
  const d = new Date(`${day}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// Where the answer came from and how recent that is, so a resident knows it's the society's own rule.
function SourceLine({ source }: { source: Source }) {
  const updated = source.updatedAt ? shortDate(source.updatedAt) : "";
  return (
    <p className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-t border-ink/10 px-4 py-2 text-[11px] font-medium leading-tight">
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="source-tick shrink-0">
          <circle cx="7" cy="7" r="6.5" fill="#1f7a4a" />
          <path d="M4 7.3l2.1 2.1L10 5" pathLength={1} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="opacity-70">From the Ajmera Infinity {/faq/i.test(source.name) ? "FAQs" : "guidelines"}</span>
      </span>
      {updated && <span className="opacity-50">Updated {updated}</span>}
    </p>
  );
}

// Turns an AI answer into a picture of the right bin, a list, numbered steps, a table or a key fact.
export default memo(function AnswerCard({ card, source }: { card: AnswerData; source?: Source | null }) {
  return (
    <article className="card-in overflow-hidden rounded-[22px] border-2 border-ink bg-white shadow-[0_3px_0_#12332a]">
      {card.type === "bin" && <BinCard card={card} />}
      {card.type === "list" && <ListCard card={card} />}
      {card.type === "steps" && <StepsCard card={card} />}
      {card.type === "table" && <TableCard card={card} />}
      {card.type === "fact" && <FactCard card={card} />}
      {source && <SourceLine source={source} />}
    </article>
  );
});

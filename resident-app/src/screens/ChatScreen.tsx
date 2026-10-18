import { useEffect, useRef, useState } from "react";
import { Send, Sprout, BookOpen } from "lucide-react";
import { Header } from "../ui";
import { BINS } from "../data";
import { classify } from "../classify";
import { searchKb, getKb, type KbEntry } from "../kb";
import { useLive, API } from "../live";

interface Msg { from: "me" | "bot"; text: string; source?: string; related?: KbEntry[]; ai?: boolean }

async function askLLM(question: string, context: KbEntry[], answeredByGuidelines: boolean): Promise<string | null> {
  if (!API) return null;
  try {
    const r = await fetch(`${API}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answeredByGuidelines, context: context.map(({ id, question, answer }) => ({ id, question, answer })) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.grounded ? (j.answer as string) : null;
  } catch {
    return null;
  }
}

const SUGGEST = ["Where does a pizza box go?", "Can I compost tea bags?", "How do I dispose batteries?", "What about broken glass?"];

async function answer(q: string): Promise<Msg> {
  const strong = searchKb(q);
  const candidates = searchKb(q, getKb(), 1);
  const top = strong[0] ?? candidates[0];
  const llm = await askLLM(q, candidates.map((h) => h.entry), strong.length > 0);
  if (top) {
    const src = `${top.entry.source} · updated ${top.entry.updatedAt}`;
    const related = candidates.filter((h) => h.entry.id !== top.entry.id).slice(0, 2).map((h) => h.entry);

    if (llm) return { from: "bot", text: llm, source: src, related, ai: true };
    if (strong[0]) return { from: "bot", text: top.entry.answer, source: src, related };
  }
  const item = q.replace(/^(where does|where do|can i|how do i|what about|is|are)\s+/i, "").replace(/\?/g, "");
  const r = await classify(item);
  if (r && !("question" in r)) return { from: "bot", text: `${BINS[r.bin].emoji} ${BINS[r.bin].label}: ${r.reason} ${r.tip}`.trim() };
  if (r) return { from: "bot", text: r.question };
  return { from: "bot", text: "I couldn't find that in your society's guidelines. I've noted it so the committee can add an answer." };
}

export default function ChatScreen() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Hi! I answer from your society's waste guidelines and FAQs. Ask me where anything goes." },
  ]);
  const { guidelines } = useLive();
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [msgs]);

  async function send(q: string) {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setText("");
    const a = await answer(q);
    setMsgs((m) => [...m, a]);
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <Header sub={`${guidelines.length} guidelines & FAQs`} title="Ask SegreGate" />
      <div ref={list} className="scroll-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "gap-2"}`}>
            {m.from === "bot" && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-mint"><Sprout size={16} /></div>}
            <div className="max-w-[80%]">
              <div className={`card px-4 py-2.5 text-[15px] leading-snug ${m.from === "me" ? "bg-moss text-white" : "bg-white"}`}>{m.text}</div>
              {m.ai && <p className="mt-1.5 inline-block rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-butter">AI · from your guidelines</p>}
              {m.source && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium opacity-60"><BookOpen size={12} />{m.source}</p>
              )}
              {m.related && m.related.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.related.map((r) => (
                    <button key={r.id} onClick={() => send(r.question)}
                      className="rounded-full border-2 border-ink bg-butter px-2.5 py-0.5 text-xs font-medium">{r.question}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {msgs.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGEST.map((s) => (
              <button key={s} onClick={() => send(s)} className="press rounded-full border-2 border-ink bg-butter px-3 py-1 text-sm font-medium shadow-[0_2px_0_#12332a]">{s}</button>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="card mx-5 mb-3 flex shrink-0 items-center gap-2 bg-white px-4 py-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about any waste item…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:opacity-40" />
        <button className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-leaf text-white"><Send size={16} /></button>
      </form>
    </div>
  );
}

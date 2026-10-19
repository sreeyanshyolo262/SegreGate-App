import { Groq } from 'groq-sdk';
import { scoreAll } from './retrieve.js';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const SEND_ALL_UP_TO = 30; // small guideline sets go to the model whole, so synonyms still match
const TOP_K = 12;

const SYSTEM = `You are SegreGate's assistant for a residential society's waste segregation rules.
Answer the resident's question using ONLY the CONTEXT entries provided. Do not use outside knowledge about local rules.
Bin colours: green bin = wet waste, blue bin = dry waste, red bin = reject waste. Treat the colour and the name as the same thing, unless the context says otherwise.
You may draw simple, direct conclusions from the context (for example a greasy item that the context says goes in the red bin does not go in the blue bin).
- Be short and practical: 1-3 sentences.
- If the context only partly covers the question, answer the covered part and say what is not covered.
- If the context does not answer the question at all, reply with exactly: NOT_COVERED
- Never invent collection times, fees, phone numbers or rules that are not in the context.
- After your answer, add a final line in the form: SOURCES: <ids of the entries you used, comma separated>`;

export async function answerQuestion(question, guidelines) {
  const ranked = scoreAll(question, guidelines);
  const candidates = guidelines.length <= SEND_ALL_UP_TO ? ranked : ranked.filter((r) => r.score > 0).slice(0, TOP_K);
  const strong = ranked.filter((r) => r.score >= 3);
  const related = (usedIds) => ranked.filter((r) => r.score > 0 && !usedIds.includes(r.entry.id)).slice(0, 2).map((r) => r.entry);

  const fallback = () => {
    if (!strong.length) return { answer: null, grounded: false, ai: false, sources: [], related: related([]) };
    const top = strong[0].entry;
    return { answer: top.answer, grounded: true, ai: false, sources: [top], related: related([top.id]) };
  };

  if (!candidates.length || !process.env.GROQ_API_KEY) return fallback();

  try {
    const ctx = candidates.map(({ entry: e }) => `[${e.id}] Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const out = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_completion_tokens: 800,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `CONTEXT:\n${ctx}\n\nQUESTION: ${question.slice(0, 500)}` },
      ],
    });
    const text = out.choices[0]?.message?.content?.trim() || '';
    if (!text || text.includes('NOT_COVERED')) return { answer: null, grounded: false, ai: true, sources: [], related: related([]) };

    const m = text.match(/SOURCES:\s*(.+)$/im);
    const cited = m ? m[1].split(/[,\s]+/).map((s) => s.replace(/[\[\]]/g, '')).filter(Boolean) : [];
    const answer = text.replace(/\n?\s*SOURCES:.*$/im, '').trim();
    let sources = candidates.map((c) => c.entry).filter((e) => cited.includes(e.id));
    if (!sources.length) sources = [candidates[0].entry];
    return { answer, grounded: true, ai: true, sources, related: related(sources.map((s) => s.id)) };
  } catch (e) {
    console.error('LLM error:', e.message);
    return fallback();
  }
}

import { Groq } from 'groq-sdk';
import { scoreAll } from './retrieve.js';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const SEND_ALL_UP_TO = 10; // tiny guideline sets go to the model whole; larger sets are narrowed by keyword retrieval first
const TOP_K = 8;

const SYSTEM = `You are SegreGate's assistant for a residential society's waste segregation rules.
Answer the resident's question using ONLY the CONTEXT entries provided. Do not use outside knowledge about local rules.
Bins at this society: wet (organic) waste goes in the green bin or a bin with a green mark, sanitary/reject waste goes in the red bin or a bin with a red cross, dry waste goes in a reusable bag or bin, and hazardous/special care waste is handed over separately. Use the terms and bins the context uses and do not assume other bin colours.
You may draw simple, direct conclusions from the context (for example, if the context says an item goes in the red bin, it does not go in the green bin).
- Be short and practical: usually 1-3 sentences, or a short list when the answer is a list of items.
- Only answer about items or situations the context actually mentions. If the specific item is not mentioned, reply NOT_COVERED instead of guessing which stream it belongs to or stretching a nearby rule.
- If the question includes a detail the context never mentions (for example a bin colour) but the item itself is covered, answer for the item using the bins the context names.
- If the context only partly covers the question, answer the covered part and say what is not covered.
- If the context does not answer the question at all, reply with exactly: NOT_COVERED
- Never invent collection times, fees, phone numbers or rules that are not in the context.
- After your answer, add a final line in the form: SOURCES: <ids of the entries you used, comma separated>`;

export async function answerQuestion(question, guidelines) {
  const ranked = scoreAll(question, guidelines);
  const candidates = guidelines.length <= SEND_ALL_UP_TO ? ranked : ranked.filter((r) => r.score > 0).slice(0, TOP_K);
  const strong = ranked.filter((r) => r.score >= 3);
  const related = (usedIds) => ranked.filter((r) => r.score >= 3 && !usedIds.includes(r.entry.id)).slice(0, 2).map((r) => r.entry);

  const fallback = () => {
    if (!strong.length) return { answer: null, grounded: false, ai: false, sources: [], related: related([]) };
    const top = strong[0].entry;
    return { answer: top.answer, grounded: true, ai: false, sources: [top], related: related([top.id]) };
  };

  if (!candidates.length || !process.env.GROQ_API_KEY) return fallback();

  try {
    const ctx = candidates.map(({ entry: e }) => `[${e.id}] Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 1, timeout: 15000 });
    const out = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_completion_tokens: 800,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `CONTEXT:\n${ctx}\n\nQUESTION: ${question.slice(0, 500)}\n\n(Residents may name a bin colour or container the guidelines don't mention. Ignore that detail and answer for the item itself, using the bins in the context. Only reply NOT_COVERED if the item or situation itself is absent from the context.)` },
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

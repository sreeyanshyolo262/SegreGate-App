import { Groq } from 'groq-sdk';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const SYSTEM = `You are SegreGate's assistant for a residential society's waste segregation rules.
Answer the resident's question using ONLY the CONTEXT entries provided. Do not use outside knowledge about local rules.
Bin colours: green bin = wet waste, blue bin = dry waste, red bin = reject waste. Treat the colour and the name as the same thing.
You may draw simple, direct conclusions from the context (for example a greasy item that the context says goes in the red bin does not go in the blue bin).
- Be short and practical: 1-3 sentences.
- If the context only partly covers the question, answer the covered part and say what is not covered.
- If the context does not answer the question at all, reply with exactly: NOT_COVERED
- Never invent collection times, fees, phone numbers or rules that are not in the context.`;

export async function askWithContext({ question, context }) {
  if (!question || !String(question).trim()) throw Object.assign(new Error('Question required'), { status: 400 });
  const entries = Array.isArray(context) ? context.slice(0, 6) : [];
  if (entries.length === 0) return { answer: null, grounded: false, sources: [] };

  const ctx = entries.map((e) => `[${e.id}] Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const out = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_completion_tokens: 800,
    reasoning_effort: 'low',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `CONTEXT:\n${ctx}\n\nQUESTION: ${String(question).slice(0, 500)}` },
    ],
  });

  const text = out.choices[0]?.message?.content?.trim() || '';
  if (!text || text.includes('NOT_COVERED')) return { answer: null, grounded: false, sources: [] };
  return { answer: text, grounded: true, sources: entries.map((e) => e.id) };
}

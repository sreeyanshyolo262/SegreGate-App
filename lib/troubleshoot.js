import { Groq } from 'groq-sdk';
import { scoreAll } from './retrieve.js';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
export const TICKET_CATEGORY = 'Need to collect garbage';

const MISSED = /\b(?:(?:was|is|are|were|did|does|do|has|have|had|could|would|wo|ca)n'?t|not(?! sure)|never|nahi|nahin)\b.{0,25}\b(?:collect(?:ed)?|picked?|taken|came|come)\b|\b(?:no one|nobody)\b.{0,25}\b(?:came|come|collect(?:ed)?)\b|\b(?:did|does|do)n'?t take\b|\b(?:missed|skipped|left behind|uncollected)\b/i;
// Pulls in the rules a resident needs to have followed, whatever words they used for the problem.
const RULES_QUERY = 'waste not collected missed segregate wet dry reject bin label flat number liner covered outside door stairwell timing collection penalty';

// Used only if the model is unavailable or returns something unusable.
const FALLBACK_CHECKS = [
  { question: 'Was your waste separated into wet, dry and reject?', why: 'Separated waste is what the collectors can take.', fix: 'Please separate it and put it out the next day.' },
  { question: 'Are your bins and bags labelled with your flat number?', why: 'Labels help make sure each home is picked up.', fix: 'Please label your bins and bags with your flat number, then put them out the next day.' },
  { question: 'Was your wet waste loose in the bin, with no liner?', why: 'Liners can\'t be composted, so wet waste goes loose.', fix: 'Please hand wet waste over loose, without a liner, and put it out the next day.' },
  { question: 'Was your waste kept just outside your door?', why: 'Collectors look for it there, and stairwells need to stay clear.', fix: 'Please keep it just outside your door and put it out the next day.' },
  { question: 'Was it out during collection time, 4 AM to 7 AM?', why: 'Door-to-door collection happens between 4 AM and 7 AM.', fix: 'Please put it out before the next collection time.' },
];

const client = () => new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 12000 });

// Does this free-text problem mean "my waste was not collected"? Obvious wording skips the model.
export async function isMissedCollection(problem) {
  if (MISSED.test(problem.replace(/’/g, "'"))) return true;
  if (!process.env.GROQ_API_KEY) return false;
  try {
    const out = await client().chat.completions.create({
      model: MODEL, temperature: 0, max_completion_tokens: 200, reasoning_effort: 'low',
      messages: [
        { role: 'system', content: 'A resident of an apartment society describes a problem. Reply with exactly YES if it means their own household waste was not collected or their bin was left or skipped by the collector. Otherwise reply with exactly NO.' },
        { role: 'user', content: problem.slice(0, 300) },
      ],
    });
    return /^\s*yes/i.test(out.choices[0]?.message?.content || '');
  } catch (e) {
    console.error('classify error:', e.message);
    return false;
  }
}

const describe = (e) => ({ title: e.question, type: e.isFaq ? 'FAQ' : 'Guideline' });

function cleanChecks(raw, byId) {
  if (!Array.isArray(raw)) return null;
  const checks = raw
    .filter((c) => c && typeof c.question === 'string' && typeof c.fix === 'string' && c.question.trim() && c.fix.trim())
    .slice(0, 5)
    .map((c) => ({
      question: c.question.trim().slice(0, 200),
      why: typeof c.why === 'string' ? c.why.trim().slice(0, 240) : '',
      fix: c.fix.trim().slice(0, 300),
      source: byId.get(c.source)?.question || null,
    }));
  return checks.length >= 3 ? checks : null;
}

// Builds the checklist from the live guidelines and FAQs, so it follows whatever the admin edits.
export async function buildChecks(problem, entries) {
  // Guidelines carry keywords so they outscore FAQs: rank each separately so both really get read.
  const ranked = scoreAll(`${problem} ${RULES_QUERY}`, entries).filter((r) => r.score > 0).map((r) => r.entry);
  const guidelines = ranked.filter((e) => !e.isFaq), faqs = ranked.filter((e) => e.isFaq);
  const top = [...guidelines.slice(0, 6), ...faqs.slice(0, 4)];
  const consulted = [...faqs.slice(0, 2), ...guidelines.slice(0, 3)].map(describe);
  const byId = new Map(top.map((e) => [e.id, e]));
  if (!top.length || !process.env.GROQ_API_KEY) return { consulted, checks: FALLBACK_CHECKS, ai: false };

  try {
    const ctx = top.map((e) => `[${e.id}] Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
    const out = await client().chat.completions.create({
      model: MODEL, temperature: 0.2, max_completion_tokens: 1200, reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `A resident says their waste was not collected. Using ONLY the CONTEXT rules, write 4 yes/no questions that check whether they followed the rules that could explain it.
Cover separating the waste, labelling with the flat number, liners, and where and when it was kept, as far as the context covers them.
Every question must be phrased so that YES means the rule was followed. Ask about the waste, not the person: "Was your wet waste loose in the bin, with no liner?", never "Did you...". Keep each question under 15 words.
Be warm and neutral, like a helpful neighbour. Never accuse or scold. "why" gives a practical reason. "fix" is a gentle instruction that uses "please".
Never invent a rule, time or penalty that is not in the context.
Reply with JSON only: {"checks":[{"question":"...","why":"one short sentence on why this rule matters","fix":"what to do if they answer no, from the context","source":"id of the entry used"}]}` },
        { role: 'user', content: `CONTEXT:\n${ctx}\n\nRESIDENT'S PROBLEM: ${problem.slice(0, 300)}` },
      ],
    });
    const parsed = JSON.parse(out.choices[0]?.message?.content || '{}');
    const checks = cleanChecks(parsed.checks, byId);
    if (checks) return { consulted, checks, ai: true };
    console.error('checks rejected: unusable model output');
  } catch (e) {
    console.error('checks error:', e.message);
  }
  return { consulted, checks: FALLBACK_CHECKS, ai: false };
}

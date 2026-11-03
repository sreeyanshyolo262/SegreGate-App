import { createHash } from 'node:crypto';
import { Groq } from 'groq-sdk';
import { directMatch, relatedTo, scoreAll, tokens } from './retrieve.js';
import { SOCIETY_NAME } from './store.js';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const SEND_ALL_UP_TO = 6; // tiny guideline sets go to the model whole; larger sets are narrowed by keyword retrieval first
const TOP_K = 6;
const TOP_K_WITH_LISTS = 3; // the main lists take up the room here, and they're what these questions need
const MAX_ENTRY_CHARS = 800; // the API key has a tokens-per-minute limit shared by every resident
const CACHE_TTL = 60 * 60 * 1000;
const CACHE_MAX = 500;

const BINS = ['wet', 'dry', 'reject', 'hazardous'];
const STREAM_CATEGORIES = ['Wet waste', 'Dry waste', 'Reject waste', 'Hazardous waste'];

const SYSTEM = `You are Bin-Buddy, a friendly neighbour who helps residents of ${SOCIETY_NAME}, a housing society, with waste segregation.
The CONTEXT is ${SOCIETY_NAME}'s own guidelines and FAQs, and its first line says when they were last updated. Take every rule from it. Never invent rules, times, fees, places or phone numbers.

Waste streams:
- wet: organic waste, green bin or any bin with a green mark
- dry: any reusable bag or bin
- reject: sanitary and reject waste, red bin or any bin with a red mark
- hazardous: handed over separately, never in a bin

Tone: warm, calm and respectful. Give the answer first. Never scold or blame, and avoid words like "wrong", "incorrect" and "violation". Use "please" for instructions. No emojis.
The rules are not optional, so state them plainly when asked and never water them down. When a rule has a consequence, say it calmly and then say what the resident can do, for example: "Waste that isn't segregated can't be collected. Please separate it and put it out the next day."

Understand what the resident means, not just the words they used. People use everyday names, brand names, other languages and typos, so the exact words will often not be in the context. Work out what the thing really is and what it is made of, then answer from the entry for that kind of thing:
- dog hair or cat fur is pet hair
- onion skin is a vegetable peel, a kurta is fabric
- packaging goes by what it is made of, whatever it held: a shampoo bottle is a plastic bottle, an atta packet is a plastic packet, a biryani box or Swiggy container is a food delivery box, made of plastic, cardboard or foil
A soiled item stays in its stream unless the context says otherwise for that item: ask them to rinse or wipe it.
Use not_covered only if nothing in the context is the same kind of thing. Sounding similar is not enough: a dead pet is not pet waste, a mattress is not fabric waste, a sofa is not wooden chips. Large items, furniture, appliances, electronics and animals are covered only if the context names them.
If the resident names a bin colour or container the context doesn't mention, ignore that detail and answer for the item.

Reply with one JSON object, using the first shape that fits. Keep every string short.
Where one specific item goes:
{"type":"bin","item":"<what the resident called it>","counts_as":"<the usual name for this kind of thing, only if the resident used different words, otherwise empty>","bin":"wet|dry|reject|hazardous","variants":[],"say":"<one friendly sentence, such as: Eggshells go with your wet waste.>","tips":["<a handling step the context gives for this item or its stream, such as rinsing, wiping or wrapping. Leave the list empty if there is none>"],"sources":["<id>"]}
Fill "variants" only if the context itself names a different stream for a different condition of this kind of item. Compostable or biodegradable spoons, forks, plates and other cutlery always need it: [{"when":"if clean and dry","bin":"dry"},{"when":"if soiled","bin":"reject"}]. Otherwise leave it empty. Never hide a different stream in "say" or "tips".
What belongs in a stream, or any list of things:
{"type":"list","title":"<title>","bin":"<stream, or empty if not about one stream>","groups":[{"label":"<group name>","items":["<short item>"]}],"note":"<optional>","sources":["<id>"]}
What to do, as a sequence:
{"type":"steps","title":"<title>","steps":["<step>"],"note":"<optional>","sources":["<id>"]}
Comparing a few things side by side:
{"type":"table","title":"<title>","columns":["<col>","<col>"],"rows":[["<cell>","<cell>"]],"note":"<optional>","sources":["<id>"]}
A fact or an explanation:
{"type":"fact","title":"<short, friendly title>","highlight":"<the direct answer in a few words, such as a time, a date or: Yes, it's mandatory. Empty if there isn't one>","points":["<one idea per point, as a full, calm sentence>"],"sources":["<id>"]}
Nothing in the context answers it:
{"type":"not_covered","is_item":<true if they named a physical thing to throw away, otherwise false>}`;

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const texts = (v, count, max) => (Array.isArray(v) ? v.map((x) => text(x, max)).filter(Boolean).slice(0, count) : []);

// The model's JSON is untrusted: keep only well-formed fields, or reject the card so a fallback is used.
export function cleanCard(raw) {
  switch (raw?.type) {
    case 'bin': {
      const variants = (Array.isArray(raw.variants) ? raw.variants : [])
        .map((v) => ({ when: text(v?.when, 70), bin: v?.bin }))
        .filter((v) => v.when && BINS.includes(v.bin))
        .slice(0, 3);
      const bin = BINS.includes(raw.bin) ? raw.bin : variants[0]?.bin;
      const say = text(raw.say, 280);
      if (!bin || !say) return null;
      // The model sometimes writes "dry if clean, reject if soiled" as a sentence: show it as the "it depends" picture too.
      if (!variants.length && /\bdry\b/i.test(say) && /\breject\b/i.test(say) && /\bsoiled\b/i.test(say)) variants.push({ when: 'if clean and dry', bin: 'dry' }, { when: 'if soiled', bin: 'reject' });
      // Two conditions pointing at the same stream don't actually vary.
      const varies = new Set(variants.map((v) => v.bin)).size > 1;
      const item = text(raw.item, 60), countsAs = text(raw.counts_as, 60);
      // Only worth showing when it really is a different name.
      const renamed = tokens(item).join(' ') !== tokens(countsAs).join(' ');
      return { type: 'bin', item, countsAs: renamed ? countsAs : '', bin, say, variants: varies ? variants : [], tips: texts(raw.tips, 3, 200) };
    }
    case 'list': {
      const groups = (Array.isArray(raw.groups) ? raw.groups : [])
        .map((g) => ({ label: text(g?.label, 60), items: texts(g?.items, 30, 70) }))
        .filter((g) => g.items.length)
        .slice(0, 6);
      if (!groups.length) return null;
      return { type: 'list', title: text(raw.title, 90), bin: BINS.includes(raw.bin) ? raw.bin : null, groups, note: text(raw.note, 240) };
    }
    case 'steps': {
      const steps = texts(raw.steps, 8, 220);
      if (steps.length < 2) return null;
      return { type: 'steps', title: text(raw.title, 90), steps, note: text(raw.note, 240) };
    }
    case 'table': {
      const columns = texts(raw.columns, 3, 30);
      if (columns.length < 2) return null;
      const rows = (Array.isArray(raw.rows) ? raw.rows : [])
        .filter((r) => Array.isArray(r) && r.length === columns.length)
        .map((r) => r.map((c) => text(c, 120)))
        .filter((r) => r.every(Boolean))
        .slice(0, 8);
      if (!rows.length) return null;
      return { type: 'table', title: text(raw.title, 90), columns, rows, note: text(raw.note, 240) };
    }
    case 'fact': {
      const points = texts(raw.points, 6, 320);
      // A highlight has to fit on one big line: anything longer is a sentence, not a key fact.
      const full = text(raw.highlight, 320);
      const highlight = full.length <= 40 ? full : '';
      if (full && !highlight && !points.length) points.push(full);
      if (!points.length && !highlight) return null;
      return { type: 'fact', title: text(raw.title, 90), highlight, points };
    }
    default:
      return null;
  }
}

// Plain text version of a card, for anything that can't show the card itself.
function cardText(c) {
  switch (c.type) {
    case 'bin': return [c.say, ...c.tips].join(' ');
    case 'list': return [c.title, ...c.groups.map((g) => `${g.label ? `${g.label}: ` : ''}${g.items.join(', ')}`), c.note].filter(Boolean).join('\n');
    case 'steps': return [c.title, ...c.steps.map((s, i) => `${i + 1}. ${s}`), c.note].filter(Boolean).join('\n');
    case 'table': return [c.title, c.columns.join(' | '), ...c.rows.map((r) => r.join(' | ')), c.note].filter(Boolean).join('\n');
    default: return [c.highlight, ...c.points].filter(Boolean).join('\n');
  }
}

// Used when the model can't be reached: the guideline itself, tidied into points. It never guesses a bin.
function entryCard(e) {
  const points = e.answer.split('\n').map((l) => l.trim().replace(/^[•\-–]\s+/, '')).filter(Boolean)
    .flatMap((l) => (l.length > 170 ? l.split(/(?<=[.!?])\s+(?=[A-Z])/) : [l]));
  return { type: 'fact', title: e.question, highlight: '', points: points.slice(0, 6) };
}

// When a question isn't plainly about one entry ("dog hair", "biryani box"), the main list for each stream lets the model recognise what the thing is.
function streamLists(entries) {
  return STREAM_CATEGORIES.map((c) => entries.filter((e) => e.category === c).sort((a, b) => b.answer.length - a.answer.length)[0]).filter(Boolean);
}

// Residents often ask the same things, and suggested questions repeat exactly: reuse answers to save the token limit.
const cache = new Map();
const versionOf = (entries) => createHash('sha1').update(JSON.stringify(entries.map((e) => [e.id, e.question, e.answer, e.updatedAt]))).digest('hex');
const keyOf = (version, question) => `${version}|${question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()}`;

// The newest change among these entries, as YYYY-MM-DD.
export const lastUpdated = (entries) => entries.map((e) => e.updatedAt).filter(Boolean).sort().pop() || null;
const longDate = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export async function answerQuestion(question, entries) {
  const ranked = scoreAll(question, entries);
  const plainlyAbout = directMatch(question, ranked);
  const related = (usedIds) => relatedTo(question, ranked, usedIds);

  let candidates = entries.length <= SEND_ALL_UP_TO ? entries : ranked.filter((r) => r.score > 0).slice(0, plainlyAbout ? TOP_K : TOP_K_WITH_LISTS).map((r) => r.entry);
  if (!plainlyAbout) candidates = [...new Map([...candidates, ...streamLists(entries)].map((e) => [e.id, e])).values()];

  const fallback = () => {
    const top = directMatch(question, ranked);
    if (!top) return { answer: null, card: null, grounded: false, ai: false, unavailable: true, sources: [], related: [] };
    const card = entryCard(top);
    return { answer: top.answer, card, grounded: true, ai: false, sources: [top], related: related([top.id]) };
  };

  if (!candidates.length) return { answer: null, card: null, grounded: false, ai: false, sources: [], related: [] };
  if (!process.env.GROQ_API_KEY) return fallback();

  const key = keyOf(versionOf(entries), question);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;

  try {
    const updated = lastUpdated(entries);
    const ctx = [
      `${SOCIETY_NAME}'s waste guidelines and FAQs${updated ? `, last updated ${longDate(updated)}` : ''}.`,
      ...candidates.map((e) => `[${e.id}] Q: ${e.question}\nA: ${e.answer.slice(0, MAX_ENTRY_CHARS)}`),
    ].join('\n\n');
    // No retries: if the shared token limit is hit, answering straight from the guideline beats making a resident wait.
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 12000 });
    const out = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_completion_tokens: 900,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `CONTEXT:\n${ctx}\n\nRESIDENT: ${question.slice(0, 300)}` },
      ],
    });
    const raw = JSON.parse(out.choices[0]?.message?.content || '{}');
    const tokens = out.usage?.total_tokens;

    let value;
    if (raw.type === 'not_covered') {
      value = { answer: null, card: null, grounded: false, ai: true, isItem: raw.is_item === true, sources: [], related: related([]), tokens };
    } else {
      const card = cleanCard(raw);
      if (!card) {
        console.error('card rejected: unusable model output');
        return fallback();
      }
      const cited = Array.isArray(raw.sources) ? raw.sources : [];
      let sources = candidates.filter((e) => cited.includes(e.id));
      if (!sources.length) sources = [candidates[0]];
      value = { answer: cardText(card), card, grounded: true, ai: true, sources, related: related(sources.map((s) => s.id)), tokens };
    }
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error('LLM error:', e.message);
    return fallback();
  }
}

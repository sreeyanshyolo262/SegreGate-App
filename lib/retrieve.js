// Keyword retrieval over the society's guidelines. Cheap, deterministic, and runs before the LLM.
// Words that say nothing about which rule applies. "waste" is in nearly every entry, so it used to match everything.
const STOP = new Set('a an the is are do does i my me we to of in on for and or can how what where which it this that go goes with be at as if there waste garbage trash old used throw put dispose away should s t don didn wasn isn doesn won'.split(' '));
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
export const tokens = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);

export function scoreAll(query, entries) {
  const q = tokens(query);
  return entries.map((entry) => {
    const kws = new Set((entry.keywords || []).flatMap(tokens));
    const qn = new Set(tokens(entry.question));
    const an = new Set(tokens(entry.answer));
    let score = 0;
    for (const t of q) score += (kws.has(t) ? 3 : 0) + (qn.has(t) ? 2 : 0) + (an.has(t) ? 1 : 0);
    return { entry, score };
  }).sort((a, b) => b.score - a.score);
}

const unique = (query) => [...new Set(tokens(query))];
const coverage = (q, entry) => {
  const known = new Set([...tokens(entry.question), ...(entry.keywords || []).flatMap(tokens)]);
  return q.filter((t) => known.has(t)).length / q.length;
};
const NEGATED = /\b(?:not|never)\b|n['’]t\b/i;
const PENALTY = /penalt|\bfines?\b|punish|non-?compliance|n['’]t segregate/i;

// The entry a question is plainly about, or null. Used when the AI is unavailable, so it would rather find nothing than the wrong rule.
export function directMatch(query, ranked) {
  const q = unique(query);
  if (!q.length) return null;
  const negated = NEGATED.test(query);
  let best = null, bestCover = 0;
  for (const { entry } of ranked) {
    if (!negated && NEGATED.test(entry.question)) continue;
    const cover = coverage(q, entry);
    if (cover > bestCover) { best = entry; bestCover = cover; }
  }
  return bestCover >= 0.6 ? best : null;
}

// Follow-up questions worth offering. Penalty rules are never offered unprompted: anyone who asks still gets a straight answer.
export function relatedTo(query, ranked, usedIds) {
  const q = unique(query);
  if (!q.length) return [];
  const restates = (entry) => {
    const own = unique(entry.question);
    return own.length > 0 && own.filter((t) => q.includes(t)).length / own.length >= 0.6;
  };
  return ranked
    .filter(({ entry, score }) => score >= 5 && coverage(q, entry) >= 0.6 && !usedIds.includes(entry.id) && !PENALTY.test(entry.question) && !restates(entry))
    .slice(0, 2)
    .map((x) => x.entry);
}

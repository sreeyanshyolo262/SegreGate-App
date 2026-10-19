// Keyword retrieval over the society's guidelines. Cheap, deterministic, and runs before the LLM.
const STOP = new Set('a an the is are do does i my me we to of in on for and or can how what where which it this that go goes with be at'.split(' '));
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

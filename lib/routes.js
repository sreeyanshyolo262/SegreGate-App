import { Router } from 'express';
import crypto from 'node:crypto';
import { getStore, SOCIETY_NAME } from './store.js';
import { answerQuestion } from './ask.js';
import { buildChecks, isMissedCollection, TICKET_CATEGORY } from './troubleshoot.js';

const router = Router();
const CATEGORIES = ['Wet waste', 'Dry waste', 'Reject waste', 'Hazardous waste', 'E-waste', 'Pickup', 'General'];
const TYPES = ['notice', 'event', 'challenge'];
const FAQ_TOPICS = ['Rules', 'Bins & liners', 'Special cases', 'Collection', 'Help', 'Why it matters'];
export const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'Villows'];

const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (res, msg) => res.status(400).json({ error: msg });
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(`${req.method} ${req.path}:`, e);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// ---------- admin auth (shared password sent as a header) ----------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? '' : 'admin123');
if (!process.env.ADMIN_PASSWORD && !process.env.VERCEL) console.warn('ADMIN_PASSWORD not set, using the dev default "admin123"');

function sameSecret(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function admin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  if (!sameSecret(req.get('x-admin-key') || '', ADMIN_PASSWORD)) return res.status(401).json({ error: 'Admin login required' });
  next();
}

// ---------- tiny per-instance rate limit for the public endpoints ----------
const hits = new Map();
function limit(max, windowMs) {
  return (req, res, next) => {
    const ip = (req.get('x-forwarded-for') || req.ip || 'x').split(',')[0].trim();
    const now = Date.now();
    const arr = (hits.get(ip + req.path) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    arr.push(now); hits.set(ip + req.path, arr);
    if (hits.size > 5000) hits.clear();
    next();
  };
}

router.get('/health', (_req, res) => res.json({ ok: true, society: SOCIETY_NAME }));

router.post('/admin/login', limit(10, 60_000), (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  if (!sameSecret(str(req.body?.password), ADMIN_PASSWORD)) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true, society: SOCIETY_NAME });
});

// ---------- residents (no password: block + flat) ----------
router.post('/residents/login', limit(20, 60_000), wrap(async (req, res) => {
  const block = str(req.body?.block, 20), flat = str(req.body?.flat, 10);
  if (!BLOCKS.includes(block)) return bad(res, 'Pick your block');
  if (!/^[0-9]{1,5}$/.test(flat)) return bad(res, 'Enter your flat number, like 1601');
  await getStore().upsertResident(block, flat);
  res.json({ ok: true, block, flat, society: SOCIETY_NAME });
}));

// ---------- guidelines ----------
router.get('/guidelines', wrap(async (_req, res) => res.json(await getStore().listGuidelines())));

function readGuideline(body) {
  const g = {
    category: str(body.category, 40),
    question: str(body.question, 300),
    answer: str(body.answer, 2000),
    keywords: Array.isArray(body.keywords) ? body.keywords.map((k) => str(k, 40)).filter(Boolean).join(',') : str(body.keywords, 300),
    source: str(body.source, 120) || 'Society waste guidelines',
  };
  if (!CATEGORIES.includes(g.category)) return { error: 'Pick a valid category' };
  if (!g.question) return { error: 'Question is required' };
  if (!g.answer) return { error: 'Answer is required' };
  return { g };
}

router.post('/guidelines', admin, wrap(async (req, res) => {
  const { g, error } = readGuideline(req.body || {});
  if (error) return bad(res, error);
  res.status(201).json(await getStore().createGuideline(g));
}));
router.put('/guidelines/:id', admin, wrap(async (req, res) => {
  const { g, error } = readGuideline(req.body || {});
  if (error) return bad(res, error);
  const row = await getStore().updateGuideline(req.params.id, g);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
}));
router.delete('/guidelines/:id', admin, wrap(async (req, res) => {
  (await getStore().deleteGuideline(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
}));

// ---------- announcements & events ----------
router.get('/announcements', wrap(async (_req, res) => res.json(await getStore().listAnnouncements())));

function readAnnouncement(body) {
  const a = {
    type: str(body.type, 20),
    title: str(body.title, 140),
    body: str(body.body, 1500),
    event_date: str(body.eventDate, 10) || null,
    event_time: str(body.eventTime, 40) || null,
    location: str(body.location, 120) || null,
    pinned: !!body.pinned,
  };
  if (!TYPES.includes(a.type)) return { error: 'Pick a valid type' };
  if (!a.title) return { error: 'Title is required' };
  if (a.type === 'event' && !/^\d{4}-\d{2}-\d{2}$/.test(a.event_date || '')) return { error: 'Events need a date' };
  if (a.type !== 'event') { a.event_date = null; a.event_time = null; a.location = null; }
  return { a };
}

router.post('/announcements', admin, wrap(async (req, res) => {
  const { a, error } = readAnnouncement(req.body || {});
  if (error) return bad(res, error);
  res.status(201).json(await getStore().createAnnouncement(a));
}));
router.put('/announcements/:id', admin, wrap(async (req, res) => {
  const { a, error } = readAnnouncement(req.body || {});
  if (error) return bad(res, error);
  const row = await getStore().updateAnnouncement(req.params.id, a);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
}));
router.delete('/announcements/:id', admin, wrap(async (req, res) => {
  (await getStore().deleteAnnouncement(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
}));

// ---------- FAQs ----------
router.get('/faqs', wrap(async (_req, res) => res.json(await getStore().listFaqs())));

function readFaq(body) {
  const f = { topic: str(body.topic, 40), question: str(body.question, 300), answer: str(body.answer, 5000) };
  if (!FAQ_TOPICS.includes(f.topic)) return { error: 'Pick a valid topic' };
  if (!f.question) return { error: 'Question is required' };
  if (!f.answer) return { error: 'Answer is required' };
  return { f };
}

router.post('/faqs', admin, wrap(async (req, res) => {
  const { f, error } = readFaq(req.body || {});
  if (error) return bad(res, error);
  res.status(201).json(await getStore().createFaq(f));
}));
router.put('/faqs/:id', admin, wrap(async (req, res) => {
  const { f, error } = readFaq(req.body || {});
  if (error) return bad(res, error);
  const row = await getStore().updateFaq(req.params.id, f);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
}));
router.delete('/faqs/:id', admin, wrap(async (req, res) => {
  (await getStore().deleteFaq(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
}));

// Everything the assistant may read. FAQs are extra: if they can't load, it still works from the guidelines.
async function knowledge(store) {
  const [guidelines, faqs] = await Promise.all([store.listGuidelines(), store.listFaqs().catch(() => [])]);
  const entries = [...guidelines, ...faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, keywords: [], source: 'Ajmera Infinity FAQs', updatedAt: f.updatedAt, isFaq: true }))];
  return { entries, counts: { faqs: faqs.length, guidelines: guidelines.length } };
}
const residentOf = (body) => ({
  block: BLOCKS.includes(str(body?.block, 20)) ? str(body?.block, 20) : null,
  flat: /^[0-9]{1,5}$/.test(str(body?.flat, 10)) ? str(body?.flat, 10) : null,
});

// ---------- report a problem: find what applies, then walk the resident through it ----------
router.post('/troubleshoot', limit(10, 60_000), wrap(async (req, res) => {
  const problem = str(req.body?.problem, 300);
  if (!problem) return bad(res, 'Tell me what went wrong');
  const store = getStore();
  const { entries, counts } = await knowledge(store);
  const { block, flat } = residentOf(req.body);

  if (await isMissedCollection(problem)) {
    const { consulted, checks } = await buildChecks(problem, entries);
    await store.logQuestion({ text: problem, grounded: true, block, flat });
    return res.json({ kind: 'missed', counts, consulted, checks, category: TICKET_CATEGORY });
  }

  const out = await answerQuestion(problem, entries);
  await store.logQuestion({ text: problem, grounded: out.grounded, block, flat });
  res.json({
    kind: 'answer',
    counts,
    consulted: out.sources.slice(0, 4).map((e) => ({ title: e.question, type: e.isFaq ? 'FAQ' : 'Guideline' })),
    answer: out.answer,
    grounded: out.grounded,
  });
}));

// ---------- the assistant: retrieve from the live guidelines, then answer ----------
router.post('/ask', limit(15, 60_000), wrap(async (req, res) => {
  const question = str(req.body?.question, 300);
  if (!question) return bad(res, 'Ask a question');
  const { block, flat } = residentOf(req.body);

  const store = getStore();
  const { entries } = await knowledge(store);
  const out = await answerQuestion(question, entries);
  await store.logQuestion({ text: question, grounded: out.grounded, block, flat });

  const pick = (e) => ({ id: e.id, question: e.question });
  const top = out.sources[0];
  res.json({
    grounded: out.grounded,
    ai: out.ai,
    answer: out.answer,
    source: top ? { name: top.source, updatedAt: top.updatedAt } : null,
    related: out.related.map(pick),
  });
}));

// ---------- admin dashboard ----------
router.get('/admin/stats', admin, wrap(async (_req, res) => {
  const store = getStore();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [counts, recent, gapList] = await Promise.all([store.counts(), store.questionsSince(since), store.openGaps()]);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const rows = recent.filter((q) => q.created_at.slice(0, 10) === d);
    days.push({ date: d, asked: rows.length, answered: rows.filter((q) => q.grounded).length });
  }
  res.json({
    guidelines: counts.guidelines,
    announcements: counts.announcements,
    residents: counts.residents,
    questionsWeek: recent.length,
    answeredWeek: recent.filter((q) => q.grounded).length,
    gaps: gapList.length,
    days,
    gapList,
  });
}));

router.get('/admin/residents', admin, wrap(async (_req, res) => res.json(await getStore().listResidents())));

router.post('/admin/questions/resolve', admin, wrap(async (req, res) => {
  const text = str(req.body?.text, 300);
  if (!text) return bad(res, 'text required');
  await getStore().resolveGaps(text);
  res.json({ ok: true });
}));

export default router;

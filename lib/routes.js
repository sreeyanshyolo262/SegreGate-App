import { Router } from 'express';
import { db, mapGuideline, mapAnnouncement, nowDate } from './db.js';
import { askWithContext } from './ask.js';

const router = Router();
const SOCIETY = 'green-meadows';
const CATEGORIES = ['Wet waste', 'Dry waste', 'Reject waste', 'E-waste', 'Pickup', 'General'];
const TYPES = ['notice', 'event', 'challenge'];

// Dev-grade admin auth: a shared key sent as a header. Replaced by role-based login in the multi-society phase.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD not set, using the dev default "admin123"');

function admin(req, res, next) {
  if (req.get('x-admin-key') !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Admin login required' });
  next();
}

const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

router.post('/admin/login', (req, res) => {
  if (str(req.body?.password) !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true, society: 'Green Meadows' });
});

// ---------- Guidelines ----------
router.get('/guidelines', (_req, res) => {
  const rows = db.prepare('select * from guidelines where society = ? order by category, question').all(SOCIETY);
  res.json(rows.map(mapGuideline));
});

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

router.post('/guidelines', admin, (req, res) => {
  const { g, error } = readGuideline(req.body || {});
  if (error) return bad(res, error);
  const id = `g-${Date.now().toString(36)}`;
  db.prepare('insert into guidelines (id, society, category, question, answer, keywords, source, updated_at) values (?,?,?,?,?,?,?,?)')
    .run(id, SOCIETY, g.category, g.question, g.answer, g.keywords, g.source, nowDate());
  res.status(201).json(mapGuideline(db.prepare('select * from guidelines where id = ?').get(id)));
});

router.put('/guidelines/:id', admin, (req, res) => {
  const { g, error } = readGuideline(req.body || {});
  if (error) return bad(res, error);
  const r = db.prepare('update guidelines set category=?, question=?, answer=?, keywords=?, source=?, updated_at=? where id=? and society=?')
    .run(g.category, g.question, g.answer, g.keywords, g.source, nowDate(), req.params.id, SOCIETY);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json(mapGuideline(db.prepare('select * from guidelines where id = ?').get(req.params.id)));
});

router.delete('/guidelines/:id', admin, (req, res) => {
  const r = db.prepare('delete from guidelines where id = ? and society = ?').run(req.params.id, SOCIETY);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ---------- Announcements & events ----------
router.get('/announcements', (_req, res) => {
  const rows = db.prepare('select * from announcements where society = ? order by pinned desc, created_at desc').all(SOCIETY);
  res.json(rows.map(mapAnnouncement));
});

function readAnnouncement(body) {
  const a = {
    type: str(body.type, 20),
    title: str(body.title, 140),
    body: str(body.body, 1500),
    event_date: str(body.eventDate, 10) || null,
    event_time: str(body.eventTime, 40) || null,
    location: str(body.location, 120) || null,
    pinned: body.pinned ? 1 : 0,
  };
  if (!TYPES.includes(a.type)) return { error: 'Pick a valid type' };
  if (!a.title) return { error: 'Title is required' };
  if (a.type === 'event' && !a.event_date) return { error: 'Events need a date' };
  if (a.type !== 'event') { a.event_date = null; a.event_time = null; a.location = null; }
  return { a };
}

router.post('/announcements', admin, (req, res) => {
  const { a, error } = readAnnouncement(req.body || {});
  if (error) return bad(res, error);
  const r = db.prepare('insert into announcements (society, type, title, body, event_date, event_time, location, pinned, created_at) values (?,?,?,?,?,?,?,?,?)')
    .run(SOCIETY, a.type, a.title, a.body, a.event_date, a.event_time, a.location, a.pinned, new Date().toISOString());
  res.status(201).json(mapAnnouncement(db.prepare('select * from announcements where id = ?').get(r.lastInsertRowid)));
});

router.put('/announcements/:id', admin, (req, res) => {
  const { a, error } = readAnnouncement(req.body || {});
  if (error) return bad(res, error);
  const r = db.prepare('update announcements set type=?, title=?, body=?, event_date=?, event_time=?, location=?, pinned=? where id=? and society=?')
    .run(a.type, a.title, a.body, a.event_date, a.event_time, a.location, a.pinned, req.params.id, SOCIETY);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json(mapAnnouncement(db.prepare('select * from announcements where id = ?').get(req.params.id)));
});

router.delete('/announcements/:id', admin, (req, res) => {
  const r = db.prepare('delete from announcements where id = ? and society = ?').run(req.params.id, SOCIETY);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ---------- Resident questions (feeds the dashboard) ----------
router.post('/ask', async (req, res) => {
  try {
    const out = await askWithContext(req.body || {});
    const q = str(req.body?.question, 300);
    // "grounded" is whether the guidelines answered it. Unanswered ones become gaps for the admin.
    const answered = req.body?.answeredByGuidelines === true || out.grounded;
    if (q) db.prepare('insert into questions (society, text, grounded, created_at) values (?,?,?,?)').run(SOCIETY, q, answered ? 1 : 0, new Date().toISOString());
    res.json(out);
  } catch (e) {
    console.error('ask error:', e);
    res.status(e.status || 500).json({ error: e.message || 'Failed to answer' });
  }
});

router.get('/admin/stats', admin, (_req, res) => {
  const count = (sql, ...p) => db.prepare(sql).get(...p).c;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const byDay = db.prepare("select substr(created_at,1,10) d, count(*) c, sum(grounded) g from questions where society=? and created_at >= ? group by d").all(SOCIETY, since);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const row = byDay.find((r) => r.d === d);
    days.push({ date: d, asked: row?.c ?? 0, answered: row?.g ?? 0 });
  }
  const gaps = db.prepare('select min(id) id, text, count(*) times, max(created_at) last from questions where society=? and grounded=0 and resolved=0 group by lower(text) order by times desc, last desc limit 8').all(SOCIETY);
  res.json({
    guidelines: count('select count(*) c from guidelines where society=?', SOCIETY),
    announcements: count('select count(*) c from announcements where society=?', SOCIETY),
    questionsWeek: count('select count(*) c from questions where society=? and created_at >= ?', SOCIETY, since),
    answeredWeek: count('select count(*) c from questions where society=? and created_at >= ? and grounded=1', SOCIETY, since),
    gaps: gaps.length,
    days,
    gapList: gaps,
  });
});

router.post('/admin/questions/resolve', admin, (req, res) => {
  const text = str(req.body?.text, 300);
  if (!text) return bad(res, 'text required');
  db.prepare('update questions set resolved=1 where society=? and lower(text)=lower(?)').run(SOCIETY, text);
  res.json({ ok: true });
});

export default router;

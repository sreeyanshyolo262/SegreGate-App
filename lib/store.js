import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOCIETY = 'ajmera-infinity';
export const SOCIETY_NAME = 'Ajmera Infinity';

const here = path.dirname(fileURLToPath(import.meta.url));
const iso = () => new Date().toISOString();
const day = (t) => String(t || '').slice(0, 10);

const toGuideline = (r) => ({
  id: r.id,
  category: r.category,
  question: r.question,
  answer: r.answer,
  keywords: r.keywords ? r.keywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
  source: r.source,
  updatedAt: day(r.updated_at),
});

const toAnnouncement = (r) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  body: r.body,
  eventDate: r.event_date,
  eventTime: r.event_time,
  location: r.location,
  pinned: !!r.pinned,
  createdAt: r.created_at,
});

const kw = (g) => (Array.isArray(g.keywords) ? g.keywords.join(',') : g.keywords || '');

// Group unanswered questions so the admin sees each distinct question once.
function groupGaps(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = r.text.toLowerCase();
    const cur = map.get(k);
    if (!cur) map.set(k, { id: r.id, text: r.text, times: 1, last: r.created_at, by: r.block && r.flat ? `${r.block}-${r.flat}` : null });
    else cur.times += 1;
  }
  return [...map.values()].sort((a, b) => b.times - a.times || (a.last < b.last ? 1 : -1)).slice(0, 8);
}

// ---------- Supabase (production) ----------
function supabaseStore(url, key) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const count = async (table) => {
    const { count: c, error } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('society', SOCIETY);
    if (error) throw new Error(error.message);
    return c ?? 0;
  };

  return {
    kind: 'supabase',
    async listGuidelines() {
      return ok(await sb.from('guidelines').select('*').eq('society', SOCIETY).order('category').order('question')).map(toGuideline);
    },
    async createGuideline(g) {
      const id = `g-${Date.now().toString(36)}`;
      return toGuideline(ok(await sb.from('guidelines').insert({ id, society: SOCIETY, category: g.category, question: g.question, answer: g.answer, keywords: kw(g), source: g.source, updated_at: iso() }).select().single()));
    },
    async updateGuideline(id, g) {
      const rows = ok(await sb.from('guidelines').update({ category: g.category, question: g.question, answer: g.answer, keywords: kw(g), source: g.source, updated_at: iso() }).eq('id', id).eq('society', SOCIETY).select());
      return rows[0] ? toGuideline(rows[0]) : null;
    },
    async deleteGuideline(id) {
      return ok(await sb.from('guidelines').delete().eq('id', id).eq('society', SOCIETY).select('id')).length > 0;
    },

    async listAnnouncements() {
      return ok(await sb.from('announcements').select('*').eq('society', SOCIETY).order('pinned', { ascending: false }).order('created_at', { ascending: false })).map(toAnnouncement);
    },
    async createAnnouncement(a) {
      return toAnnouncement(ok(await sb.from('announcements').insert({ society: SOCIETY, ...a }).select().single()));
    },
    async updateAnnouncement(id, a) {
      const rows = ok(await sb.from('announcements').update(a).eq('id', id).eq('society', SOCIETY).select());
      return rows[0] ? toAnnouncement(rows[0]) : null;
    },
    async deleteAnnouncement(id) {
      return ok(await sb.from('announcements').delete().eq('id', id).eq('society', SOCIETY).select('id')).length > 0;
    },

    async upsertResident(block, flat) {
      ok(await sb.from('residents').upsert({ society: SOCIETY, block, flat, last_seen: iso() }, { onConflict: 'society,block,flat' }));
    },
    async listResidents() {
      return ok(await sb.from('residents').select('block, flat, first_seen, last_seen').eq('society', SOCIETY).order('last_seen', { ascending: false }).limit(2000))
        .map((r) => ({ block: r.block, flat: r.flat, firstSeen: r.first_seen, lastSeen: r.last_seen }));
    },
    async logQuestion(q) {
      ok(await sb.from('questions').insert({ society: SOCIETY, text: q.text, grounded: q.grounded, block: q.block || null, flat: q.flat || null }));
    },
    async questionsSince(since) {
      return ok(await sb.from('questions').select('created_at, grounded').eq('society', SOCIETY).gte('created_at', since).limit(5000));
    },
    async openGaps() {
      return groupGaps(ok(await sb.from('questions').select('id, text, created_at, block, flat').eq('society', SOCIETY).eq('grounded', false).eq('resolved', false).order('created_at', { ascending: false }).limit(1000)));
    },
    async resolveGaps(text) {
      const rows = ok(await sb.from('questions').select('id, text').eq('society', SOCIETY).eq('grounded', false).eq('resolved', false).limit(1000));
      const ids = rows.filter((r) => r.text.toLowerCase() === text.toLowerCase()).map((r) => r.id);
      if (ids.length) ok(await sb.from('questions').update({ resolved: true }).in('id', ids));
    },
    async counts() {
      const [guidelines, announcements, residents] = await Promise.all([count('guidelines'), count('announcements'), count('residents')]);
      return { guidelines, announcements, residents };
    },
  };
}

// ---------- In-memory (local development without Supabase) ----------
function memoryStore() {
  const seed = JSON.parse(fs.readFileSync(path.join(here, 'seed-guidelines.json'), 'utf8'));
  const guidelines = seed.map((g) => ({ id: g.id, category: g.category, question: g.question, answer: g.answer, keywords: (g.keywords || []).join(','), source: g.source, updated_at: g.updatedAt }));
  const announcements = [];
  const residents = new Map();
  const questions = [];
  let aid = 1, qid = 1;

  return {
    kind: 'memory',
    async listGuidelines() { return guidelines.map(toGuideline).sort((a, b) => a.category.localeCompare(b.category) || a.question.localeCompare(b.question)); },
    async createGuideline(g) {
      const row = { id: `g-${Date.now().toString(36)}`, category: g.category, question: g.question, answer: g.answer, keywords: kw(g), source: g.source, updated_at: iso() };
      guidelines.push(row); return toGuideline(row);
    },
    async updateGuideline(id, g) {
      const row = guidelines.find((r) => r.id === id); if (!row) return null;
      Object.assign(row, { category: g.category, question: g.question, answer: g.answer, keywords: kw(g), source: g.source, updated_at: iso() });
      return toGuideline(row);
    },
    async deleteGuideline(id) { const i = guidelines.findIndex((r) => r.id === id); if (i < 0) return false; guidelines.splice(i, 1); return true; },

    async listAnnouncements() { return announcements.map(toAnnouncement).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.createdAt < b.createdAt ? 1 : -1)); },
    async createAnnouncement(a) { const row = { id: aid++, created_at: iso(), ...a }; announcements.push(row); return toAnnouncement(row); },
    async updateAnnouncement(id, a) { const row = announcements.find((r) => r.id === Number(id)); if (!row) return null; Object.assign(row, a); return toAnnouncement(row); },
    async deleteAnnouncement(id) { const i = announcements.findIndex((r) => r.id === Number(id)); if (i < 0) return false; announcements.splice(i, 1); return true; },

    async upsertResident(block, flat) {
      const k = `${block}|${flat}`, now = iso();
      residents.set(k, { block, flat, first_seen: residents.get(k)?.first_seen || now, last_seen: now });
    },
    async listResidents() {
      return [...residents.values()].map((r) => ({ block: r.block, flat: r.flat, firstSeen: r.first_seen, lastSeen: r.last_seen })).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
    },
    async logQuestion(q) { questions.push({ id: qid++, text: q.text, grounded: q.grounded, resolved: false, block: q.block || null, flat: q.flat || null, created_at: iso() }); },
    async questionsSince(since) { return questions.filter((q) => q.created_at >= since).map(({ created_at, grounded }) => ({ created_at, grounded })); },
    async openGaps() { return groupGaps(questions.filter((q) => !q.grounded && !q.resolved).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))); },
    async resolveGaps(text) { for (const q of questions) if (q.text.toLowerCase() === text.toLowerCase()) q.resolved = true; },
    async counts() { return { guidelines: guidelines.length, announcements: announcements.length, residents: residents.size }; },
  };
}

let cached;
export function getStore() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) cached = supabaseStore(url, key);
  else if (process.env.VERCEL) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are not set on the server');
  else { console.warn('Supabase env not set: using an in-memory store (data resets on restart)'); cached = memoryStore(); }
  return cached;
}

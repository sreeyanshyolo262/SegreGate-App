// Loads lib/seed-guidelines.json into Supabase, replacing the generic starter entries.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-supabase.mjs
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const STARTERS = ['wet-1', 'wet-2', 'dry-1', 'dry-2', 'rej-1', 'rej-2', 'rej-3', 'rej-4', 'ew-1', 'gen-1', 'gen-2', 'gen-3'];
const seed = JSON.parse(fs.readFileSync(new URL('../lib/seed-guidelines.json', import.meta.url), 'utf8'));

const del = await sb.from('guidelines').delete().in('id', STARTERS).select('id');
if (del.error) throw new Error(del.error.message);
console.log(`removed ${del.data.length} starter entries`);

const rows = seed.map((g) => ({
  id: g.id, society: 'ajmera-infinity', category: g.category, question: g.question, answer: g.answer,
  keywords: (g.keywords || []).join(','), source: g.source, updated_at: new Date().toISOString(),
}));
const up = await sb.from('guidelines').upsert(rows, { onConflict: 'id' }).select('id');
if (up.error) throw new Error(up.error.message);
console.log(`upserted ${up.data.length} guidelines`);

const all = await sb.from('guidelines').select('category');
const by = {};
for (const r of all.data) by[r.category] = (by[r.category] || 0) + 1;
console.log('now in database:', all.data.length, JSON.stringify(by));

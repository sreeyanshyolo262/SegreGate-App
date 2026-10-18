import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'data'), { recursive: true });

export const db = new DatabaseSync(path.join(root, 'data', 'segregate.db'));

// Every row belongs to a society, so the platform can later host many societies.
db.exec(`
  create table if not exists guidelines (
    id text primary key,
    society text not null default 'green-meadows',
    category text not null,
    question text not null,
    answer text not null,
    keywords text not null default '',
    source text not null default 'Society waste guidelines',
    updated_at text not null
  );
  create table if not exists announcements (
    id integer primary key autoincrement,
    society text not null default 'green-meadows',
    type text not null check (type in ('notice','event','challenge')),
    title text not null,
    body text not null default '',
    event_date text,
    event_time text,
    location text,
    pinned integer not null default 0,
    created_at text not null
  );
  create table if not exists questions (
    id integer primary key autoincrement,
    society text not null default 'green-meadows',
    text text not null,
    grounded integer not null,
    resolved integer not null default 0,
    created_at text not null
  );
`);

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

function seed() {
  if (db.prepare('select count(*) c from guidelines').get().c === 0) {
    const seedFile = path.join(root, 'lib', 'seed-guidelines.json');
    const insert = db.prepare(
      'insert into guidelines (id, category, question, answer, keywords, source, updated_at) values (?,?,?,?,?,?,?)',
    );
    for (const g of JSON.parse(fs.readFileSync(seedFile, 'utf8'))) {
      insert.run(g.id, g.category, g.question, g.answer, (g.keywords || []).join(','), g.source, g.updatedAt);
    }
  }
  if (db.prepare('select count(*) c from announcements').get().c === 0) {
    const ins = db.prepare(
      'insert into announcements (type, title, body, event_date, event_time, location, pinned, created_at) values (?,?,?,?,?,?,?,?)',
    );
    ins.run('challenge', 'No plastic in wet waste', 'Week challenge: keep plastic out of the green bin. +150 pts for every clean pickup.', null, null, null, 1, daysAgo(2));
    ins.run('notice', 'Collection moved to 8 am on Sunday', 'Municipal holiday schedule. Please keep bins out by 7:45 am.', null, null, null, 0, daysAgo(1));
  }
  // Demo resident questions so the admin dashboard has something to show on a fresh database.
  if (db.prepare('select count(*) c from questions').get().c === 0) {
    const ins = db.prepare('insert into questions (text, grounded, created_at) values (?,?,?)');
    const demo = [
      ['Where do pizza boxes go?', 1, 0], ['Can I compost tea bags?', 1, 0], ['What about broken glass?', 1, 1],
      ['How do I dispose batteries?', 1, 1], ['Where do old clothes go?', 0, 1], ['Can I put coconut shells in the wet bin?', 0, 2],
      ['Where does thermocol go?', 1, 2], ['What do I do with old mattresses?', 0, 3], ['Is aluminium foil recyclable?', 0, 4],
      ['Where do I throw used cooking oil?', 0, 5], ['Where do pizza boxes go?', 1, 5], ['Do I need to wash milk packets?', 1, 6],
    ];
    for (const [t, g, d] of demo) ins.run(t, g, daysAgo(d));
  }
}
seed();

export const nowDate = today;

export const mapGuideline = (r) => ({
  id: r.id,
  category: r.category,
  question: r.question,
  answer: r.answer,
  keywords: r.keywords ? r.keywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
  source: r.source,
  updatedAt: r.updated_at,
});

export const mapAnnouncement = (r) => ({
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

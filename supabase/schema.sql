-- SegreGate schema for Supabase. Paste this whole file into: Supabase dashboard -> SQL Editor -> New query -> Run.

create table if not exists guidelines (
  id text primary key,
  society text not null default 'ajmera-infinity',
  category text not null,
  question text not null,
  answer text not null,
  keywords text not null default '',
  source text not null default 'Society waste guidelines',
  updated_at timestamptz not null default now()
);

create table if not exists announcements (
  id bigint generated always as identity primary key,
  society text not null default 'ajmera-infinity',
  type text not null check (type in ('notice', 'event', 'challenge')),
  title text not null,
  body text not null default '',
  event_date date,
  event_time text,
  location text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id bigint generated always as identity primary key,
  society text not null default 'ajmera-infinity',
  text text not null,
  grounded boolean not null,
  resolved boolean not null default false,
  block text,
  flat text,
  created_at timestamptz not null default now()
);
create index if not exists questions_society_created on questions (society, created_at desc);

create table if not exists residents (
  id bigint generated always as identity primary key,
  society text not null default 'ajmera-infinity',
  block text not null,
  flat text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (society, block, flat)
);

-- Row level security on with no policies: nobody can read or write from a browser.
-- Only the API server (which uses the service key) can touch these tables.
alter table guidelines enable row level security;
alter table announcements enable row level security;
alter table questions enable row level security;
alter table residents enable row level security;

-- Starter guidelines. Edit or replace them from the admin dashboard.
insert into guidelines (id, category, question, answer, keywords, source) values
  ('wet-1', 'Wet waste', 'What goes in the green (wet) bin?', 'Fruit and vegetable peels, cooked food and leftovers (veg and non-veg), egg shells, chicken and fish bones, rotten produce, tea bags and coffee grounds (no staples), food-soiled tissue, and garden or puja waste like leaves, flowers and garlands.', 'green,wet,compost,organic,kitchen', 'Society waste guidelines'),
  ('wet-2', 'Wet waste', 'What should never go in the wet bin?', 'Plastic, foil, glass, metal, rubber bands, stapler pins and non-cotton strings. Remove the thread from garlands before putting them in.', 'not,contaminate,avoid', 'Society waste guidelines'),
  ('dry-1', 'Dry waste', 'What goes in the blue (dry) bin?', 'Clean and dry paper, cardboard, cartons, plastic bottles, containers and wrappers, milk packets, metal cans and tins, unbroken glass bottles and jars, rubber, thermocol, old mops and sponges, ceramics, wood and coconut shells.', 'blue,dry,recycle,recycling,plastic,paper', 'Society waste guidelines'),
  ('dry-2', 'Dry waste', 'Do I need to wash dry waste before throwing it?', 'Yes. Rinse and dry anything that is food-soiled, like milk packets and containers. Oil packets only need to be fully drained. Items that cannot be cleaned go in the red bin.', 'wash,clean,rinse,soiled,greasy,pizza', 'Society waste guidelines'),
  ('rej-1', 'Reject waste', 'What goes in the red (reject) bin?', 'Diapers, sanitary napkins, used tissues, bandages, condoms, expired medicines, swept dust, hair, and heavily soiled plastic or paper that cannot be cleaned. Wrap sanitary items in newspaper.', 'red,reject,landfill,sanitary,diaper,medicine', 'Society waste guidelines'),
  ('rej-2', 'Reject waste', 'How do I dispose sharps like blades, razors and syringes?', 'Wrap them in newspaper and hand them to the collector separately. Do not put them loose in any bin.', 'blade,razor,syringe,needle,sharp', 'Society waste guidelines'),
  ('rej-3', 'Reject waste', 'What do I do with broken glass?', 'Wrap it in newspaper, keep it separate from the bins and tell the collector. Unbroken glass bottles and jars go in the dry bin.', 'glass,broken', 'Society waste guidelines'),
  ('rej-4', 'Reject waste', 'How do I dispose paint, solvents and chemicals?', 'These are hazardous waste. Keep them in their container and hand them over separately. Never mix them with other waste.', 'paint,chemical,solvent,hazardous', 'Society waste guidelines'),
  ('ew-1', 'E-waste', 'How do I dispose batteries, bulbs and electronics?', 'Batteries, CDs, thermometers, bulbs, tube lights and CFLs are e-waste. Do not put them in the bins. Hand them over separately to the collector or the e-waste drop point.', 'battery,batteries,bulb,cfl,tubelight,electronic,charger,cable,phone', 'Society waste guidelines'),
  ('gen-1', 'General', 'Can I use plastic bags to line the wet bin?', 'No. Plastic contaminates compost. Use newspaper or put the waste in directly.', 'bag,liner,line,polythene,plastic', 'Society waste guidelines'),
  ('gen-2', 'General', 'Where do tea bags and coffee grounds go?', 'Wet bin, as long as the tea bag has no staple and is not plastic mesh.', 'tea,coffee,teabag', 'Society waste guidelines'),
  ('gen-3', 'General', 'Where do pizza boxes go?', 'A clean box goes in the dry bin. If it is greasy or food-soiled, tear off the clean part for dry and put the soiled part in the red bin.', 'pizza,box,cardboard,greasy', 'Society waste guidelines')
on conflict (id) do nothing;

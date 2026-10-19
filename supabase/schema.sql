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

-- Ajmera Infinity waste segregation guidelines. Edit or add more from the admin dashboard.
insert into guidelines (id, category, question, answer, keywords, source) values
  ('ai-gen-overview', 'General', 'Is waste segregation mandatory at Ajmera Infinity?', 'Yes. Segregation at source is mandatory under the Solid Waste Management (SWM) Rules, 2016, and this is not a new requirement. Ajmera Infinity is a notified Bulk Waste Generator (BWG) and is legally accountable for compliance. Inspections or audits can happen at any time, and non-compliance can attract significant penalties. BWGs must ensure segregation at source, scientific processing of wet waste, and responsible disposal of dry and reject waste.', 'mandatory,compulsory,law,legal,rules,swm,bulk waste generator,bwg,inspection,audit', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-gen-streams', 'General', 'What are the waste categories I need to separate?', 'The updated 2026 SWM guidelines require four-stream segregation: Wet, Dry, Sanitary and Special Care waste. At Ajmera Infinity this means: wet (organic) waste in the green bin, dry waste in a reusable bag or bin, sanitary/reject waste in the red bin, and hazardous/special care waste handed over separately.', 'streams,categories,types,four,bins,how many,separate,segregate', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-gen-dates', 'General', 'When do the new segregation rules start and when are they enforced?', 'Adoption started on 1 March 2026. Enforcement started on 1 April 2026, and penalties apply from 1 April 2026.', 'date,dates,deadline,start,begin,enforcement,march,april,2026', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-gen-directive', 'General', 'Where can I read the official 2026 SWM directive?', 'The official directive is at https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jan/doc2026129773501.pdf', 'official,directive,pdf,link,government,pib,document', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-gen-support', 'General', 'Who can help me with segregation, and is there a guide?', 'Sustainability Volunteers are available during the transition to answer questions. Your block Sustainability Volunteer is the first person to ask. A step-by-step segregation guide is at https://drive.google.com/file/d/1sqP_iwxmj56imUouwabbwcbpEUQz0V5H/view?usp=drive_link', 'help,support,volunteer,sustainability,guide,contact,question,steps', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-gen-why', 'General', 'Why does segregation matter?', 'Much of our waste ends up in landfills, where it is often burned openly and releases harmful smoke, or in illegal dump yards where chemicals and leachate poison the soil and eventually the groundwater. This contributes to respiratory problems, exposure to carcinogens from burning plastics and rubber, and contaminated water. Proper segregation protects sanitation workers, maximizes recycling and composting, and prevents landfill overflow. It is about protecting our health, our communities and our homes.', 'why,reason,important,matters,landfill,health,environment,pollution', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-gen-donate', 'General', 'What should I do with items I want to donate?', 'Do not leave donation items out with your waste, because they can be mistaken for dry waste. Hand them over directly or give them at donation drives.', 'donate,donation,give away,old clothes,reuse,charity,drive', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-wet-1', 'Wet waste', 'What counts as wet (organic) waste?', 'Kitchen waste: vegetable and fruit peels, cooked food and leftovers, egg shells, chicken and fish bones, rotten fruits and vegetables, tea bags and coffee grinds, and leaf plates. Garden waste: fallen leaves and twigs, puja flowers and garlands, and weeds.', 'wet,organic,kitchen,food,peel,peels,fruit,vegetable,egg,bones,tea bag,coffee,leaf plate,leaves,flowers,garland,puja,garden,weeds,leftovers,compost,green', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-wet-bin', 'Wet waste', 'How do I keep and hand over wet waste?', 'Use the green bin, or any bin with a prominent green mark (a tick). Keep it covered. Do NOT use liners: hand the waste over loose. Hand it over daily and wash the bin regularly. A small piece of paper at the bottom to absorb moisture is fine, but don''t line the whole bin with newspaper.', 'wet,green bin,green mark,liner,liners,loose,daily,wash,cover,covered,newspaper,bin', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-wet-not', 'Wet waste', 'What does NOT belong in wet waste?', 'Anything that isn''t food or natural organic matter does not belong in wet waste. Biodegradable or compostable cutlery is not wet waste: if it is clean and dry, treat it as dry waste; if it is soiled, treat it as reject waste.', 'not wet,compostable,cutlery,biodegradable,spoon,fork,plate,avoid,contaminate', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-dry-1', 'Dry waste', 'What counts as dry waste?', 'Plastic (rinse if soiled): plastic covers, bottles, boxes and items, chips and coffee wrappers, milk and curd packets, broken toys. Paper (wipe if soiled): newspaper and magazines, stationery and junk mail, cardboard cartons, pizza boxes and Tetra-packs, paper cups and plates. Metal: foil containers and wraps, metal cans. Other dry waste: unbroken glass items, rubber and thermocol, old mops, dusters and sponges, cosmetics, ceramics and wooden chips, flower pots and planters, coconut shells, fabric waste and broken footwear. Unbroken glass, flower pots and fabric/footwear have special handling.', 'dry,plastic,paper,cardboard,carton,metal,can,foil,glass,bottle,wrapper,packet,milk packet,tetra,thermocol,rubber,sponge,mop,duster,cosmetics,ceramic,coconut shell,toys,newspaper,magazine,cup,plate,recycle', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-dry-container', 'Dry waste', 'What do I put dry waste in?', 'Use any reusable bag or bin only. No disposable liners for dry waste.', 'dry,bag,container,bin,liner,liners,reusable,disposable,carry', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-dry-clean', 'Dry waste', 'Do I need to clean dry waste before handing it over?', 'Rinse plastic if it is soiled, and wipe paper if it is soiled.', 'clean,wash,rinse,wipe,soiled,dirty,greasy,oily,plastic,paper', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-dry-pizza', 'Dry waste', 'Where do pizza boxes and Tetra-packs go?', 'Pizza boxes and Tetra-packs are dry waste (paper). Wipe them if they are soiled.', 'pizza,box,tetra,tetrapak,carton,cardboard,juice,milk carton', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-dry-fragile', 'Dry waste', 'How do I dispose unbroken glass bottles and flower pots?', 'It is best to give them away for reuse to crafters, helpers or donation drives. If you must discard them, keep them separate and place them unwrapped in a sturdy box with fillers, so collectors can see the contents and handle them safely.', 'glass,bottle,bottles,jar,flower pot,pots,planter,planters,fragile,unbroken,box,fillers', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-dry-fabric', 'Dry waste', 'How do I dispose fabric waste, old clothes and broken footwear?', 'Wash fabric before disposal, to protect workers at Textile Recovery Facilities and to allow repurposing. Periodic collection drives for fabric and broken footwear are being considered. If the clothes or footwear are still usable, hand them over directly or give them at donation drives instead.', 'fabric,cloth,clothes,clothing,textile,t-shirt,shirt,jeans,footwear,shoes,slippers,chappal,sandals,rags,bedsheet,curtain', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-rej-1', 'Reject waste', 'What counts as sanitary or reject waste?', 'Diapers and sanitary napkins, bandages, nails, used tissues, pet poop, human hair and pet hair, swept house dust, soiled biodegradable or compostable cutlery, and compostable or "oxo-biodegradable" liners (they can''t be told apart from plastic bags, so they count as reject).', 'reject,sanitary,diaper,diapers,napkin,napkins,pad,pads,bandage,nails,tissue,tissues,pet,poop,hair,dust,sweepings,red', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-rej-bin', 'Reject waste', 'How do I keep and hand over reject waste?', 'Use the red bin, or any bin with a clear red cross mark. Do NOT use plastic liners. Wrap items adequately in paper and place them directly in the bin. Liners are not required.', 'reject,red bin,red cross,wrap,paper,liner,liners,bin,sanitary', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-rej-pet', 'Reject waste', 'How do I dispose pet waste?', 'Preferably use the designated community pet waste bins. Otherwise, place it in a securely tied bag (preferably red) in the reject (red) bin.', 'pet,dog,cat,poop,waste,stool,droppings,animal', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-rej-medical', 'Reject waste', 'How do I handle household medical waste?', 'If a liner is needed for hygiene, use the smallest available bag and tie it securely. This exception does not apply to sanitary waste like diapers or napkins. Medicines, syringes and injection vials are biomedical hazardous waste and are handed over separately.', 'medical,household,hygiene,liner,bag,medicine,syringe,dressing,cotton', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-haz-1', 'Hazardous waste', 'What is hazardous or special care waste, and how do I hand it over?', 'Hazardous waste is handed over separately and must not be mixed with other streams. Physical hazardous: broken glass, razors, blades, bulbs and tube lights. Biomedical hazardous: used syringes, injection vials, medicines. Chemical hazardous: batteries (lithium-ion), paints, rubble, cement powder. Designated collection points will be set up across the campus, and details will be shared soon.', 'hazardous,special care,separately,collection point,dangerous,toxic,chemical,biomedical,physical', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-haz-battery', 'Hazardous waste', 'How do I dispose batteries, bulbs and tube lights?', 'Batteries (lithium-ion), bulbs and tube lights are hazardous waste. Hand them over separately and do not mix them with other waste. Designated collection points will be set up across the campus, and details will be shared soon.', 'battery,batteries,lithium,bulb,bulbs,tube light,tubelight,cfl,led,e-waste,electronic,charger', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-haz-sharps', 'Hazardous waste', 'What do I do with broken glass, razors and blades?', 'Broken glass, razors and blades are physical hazardous waste. Hand them over separately and do not mix them with other waste. Designated collection points will be set up across the campus, and details will be shared soon.', 'broken glass,glass,razor,razors,blade,blades,sharp,sharps,cut,needle', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-haz-medicine', 'Hazardous waste', 'How do I dispose medicines, syringes and injection vials?', 'Medicines, used syringes and injection vials are biomedical hazardous waste. Hand them over separately and do not mix them with other waste. Designated collection points will be set up across the campus, and details will be shared soon.', 'medicine,medicines,tablet,tablets,syringe,syringes,injection,vial,vials,expired,biomedical,drugs', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-haz-chemical', 'Hazardous waste', 'How do I dispose paint, rubble and cement powder?', 'Paints, rubble and cement powder are chemical hazardous waste. Hand them over separately and do not mix them with other waste. Designated collection points will be set up across the campus, and details will be shared soon.', 'paint,paints,rubble,cement,construction,debris,chemical,solvent,renovation', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-liner-1', 'General', 'Can I use plastic bags or liners for my waste?', 'Wet waste: no liners at all. Plastic liners can''t be composted, can''t be recycled once soiled, and end up in landfill. Even "compostable" bags usually need industrial composting and don''t break down reliably in decentralized setups. Dry waste: use only reusable bags or bins. Reject waste: liners are not required; wrap the waste securely in paper and place it in the bin.', 'liner,liners,plastic bag,bag,bags,polythene,garbage bag,dustbin bag,compostable bag,cover', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-liner-ok', 'General', 'When are liners acceptable?', 'Liners are acceptable in hygiene cases such as household medical waste (use the smallest bag and tie it securely), and for large-volume community waste handling.', 'liner,liners,acceptable,allowed,exception,hygiene,medical,community', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-liner-old', 'General', 'What can I do with liners I have already bought?', 'You can use them for pet waste, laundry storage, or packing shoes for travel. You can also donate them to small nearby clinics. The Association will share more options soon.', 'liner,liners,already bought,leftover,stock,unused,garbage bags,use up,donate', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-bin-label', 'General', 'How should I label my bins and bags?', 'Label all bins and bags clearly with your flat number. This is required for monitoring and accountability. You may use any bins for wet and reject waste. The wet bin needs a visible green mark (a tick) and the reject bin needs a clear red cross.', 'label,labelling,mark,flat number,name,tag,green mark,red cross,bin,bins,monitoring', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-bin-size', 'General', 'What size should my bins be?', 'Bins must be a reasonable size. A bin that is too small may be mistaken for waste during collection.', 'size,small,big,large,bin,bins,dustbin,container', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-pick-time', 'Pickup', 'When is waste collected?', 'Collection is door-to-door, between 4 AM and 7 AM.', 'time,timing,timings,when,collection,pickup,pick up,schedule,morning,door to door,collector', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-pick-where', 'Pickup', 'Where should I keep my waste for collection?', 'Keep it just outside your door. Never leave it in the fire escape stairwell, and never where it obstructs anyone''s passage.', 'where,keep,place,outside,door,stairwell,fire escape,staircase,passage,corridor,lobby,landing', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-pick-missed', 'Pickup', 'What if my waste was missed or not collected?', 'Take the bin back in and put it out again the next day. If it keeps happening, tell your block Sustainability Volunteer, who will inform the collector.', 'missed,not collected,skipped,left,didn''t take,complaint,collector,volunteer,uncollected', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-pen-1', 'General', 'What happens if I don''t segregate my waste?', 'For initial non-compliance, the waste will not be collected: segregate correctly and put it out the next day. Enforcement is meant to be corrective, not punitive, but consistent non-segregation cannot be accommodated in a Bulk Waste Generator system. Penalties apply from 1 April 2026, in line with applicable rules and community decisions. Unsegregated waste WILL attract a penalty.', 'penalty,penalties,fine,punishment,not collected,refused,non-compliance,unsegregated,consequence,mixed waste', 'Ajmera Infinity Waste Segregation Guidelines'),
  ('ai-party-1', 'General', 'How should I manage waste when hosting a party or gathering?', 'Set up separate wet and dry bins for guests. Prefer reusable cutlery and crockery. If you use disposables, choose leaf-based or fully compostable ones so the waste stays in the wet stream. For non-organic disposables like paper plates or glasses: collect soiled paper plates and food-contaminated items separately and hand them over as instructed. Clean, used water glasses can go in dry waste, while glasses used for juice or other drinks go with the soiled items.', 'party,gathering,guests,event,celebration,birthday,disposable,disposables,paper plates,glasses,cups,cutlery,crockery,function', 'Ajmera Infinity Waste Segregation Guidelines')
on conflict (id) do nothing;

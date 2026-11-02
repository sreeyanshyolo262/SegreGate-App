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

-- Resident FAQs. Edit or add more from the admin dashboard.
create table if not exists faqs (
  id text primary key,
  society text not null default 'ajmera-infinity',
  position integer not null default 0,
  topic text not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row level security on with no policies: only the API server can touch this table.
alter table faqs enable row level security;

insert into faqs (id, position, topic, question, answer) values
  ('faq-01', 10, 'Rules', 'Is waste segregation mandatory or optional?', 'Waste segregation at source is mandatory under the Solid Waste Management Rules, 2016, notified under the Environment (Protection) Act.
All residents are legally required to segregate waste into prescribed categories before handing it over for collection.'),
  ('faq-02', 20, 'Rules', 'Why is this being enforced now?', 'Waste segregation at source has been mandatory under the Solid Waste Management Rules, 2016. This is not a new requirement. Segregation at source has always remained a statutory requirement.
Ajmera Infinity is classified as a notified Bulk Waste Generator (BWG) under the Solid Waste Management framework and is therefore legally accountable for full compliance. Regulatory inspections or audits may be conducted at any time, and non-compliance can attract significant penalties under applicable law.
In line with the updated 2026 Solid Waste Management guidelines, which require four-stream segregation at source — Wet Waste, Dry Waste, Sanitary Waste, and Special Care Waste — the association is implementing structured 4-way segregation to align with current regulatory standards and ensure full statutory compliance.
For more details, you can read the official directive on the SWM Rules, 2026 here: https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jan/doc2026129773501.pdf'),
  ('faq-03', 30, 'Rules', 'Why does this apply to Ajmera Infinity?', 'Ajmera Infinity is classified as a Bulk Waste Generator (BWG) under the Solid Waste Management Rules.
Under these rules, BWGs must ensure:
• Segregation at source
• Scientific processing of wet waste
• Responsible disposal of dry and reject waste
This is therefore a legal compliance requirement, not a voluntary initiative.'),
  ('faq-04', 40, 'Rules', 'When does adoption start at Ajmera Infinity?', 'Adoption will begin on 1 March 2026.'),
  ('faq-05', 50, 'Rules', 'When does enforcement begin?', 'Enforcement will commence from 1 April 2026.
From this date onward, corrective measures and penalties will apply for non-compliance, in accordance with applicable rules and community decisions.'),
  ('faq-06', 60, 'Rules', 'What is the penalty for non-compliance?', 'For initial instances of non-compliance, the waste will not be collected. Residents are expected to segregate the waste correctly and place it out for collection the following day.
It is imperative that all bins and bags are clearly labelled with the respective flat number to enable proper monitoring and accountability.
The intent of enforcement is corrective rather than punitive. However, consistent non-segregation cannot be accommodated in a Bulk Waste Generator system.'),
  ('faq-07', 70, 'Help', 'What if I am unsure how to segregate certain items?', 'Residents are expected to follow the official segregation guidelines. A complete step-by-step segregation guide is available here: https://drive.google.com/file/d/1sqP_iwxmj56imUouwabbwcbpEUQz0V5H/view?usp=drive_link'),
  ('faq-08', 80, 'Help', 'Is there support during the transition period?', 'Yes. Sustainability Volunteers will be available to assist and clarify any doubts.'),
  ('faq-09', 90, 'Bins & liners', 'Can we use any bins for wet and reject waste?', 'Yes, absolutely. You may use any bins of your choice.
Please ensure:
• There is a prominently visible GREEN MARKING (✓) on the WET WASTE bin.
• There is a clear RED CROSS MARKING (❌) on the REJECT WASTE bin.
• The bin is of a reasonable size and not so small that it may be mistaken for waste itself during collection.
Clear visual identification and appropriate bin size help ensure smooth and error-free pickup.'),
  ('faq-10', 100, 'Bins & liners', 'Why are liners not permitted for wet waste?', 'Wet waste must be handed over loose, without plastic liners.
Plastic liners:
• Cannot be composted
• Cannot be recycled once soiled
• Ultimately end up in landfills
Even “100% compostable / oxo-biodegradable” bags typically require controlled industrial composting conditions and do not reliably break down in decentralized composting setups.
Additionally, compostable liners are manufactured in the same standard colours as regular plastic bags and appear identical in texture and finish. This makes it impossible for collection staff to visually distinguish compostable from conventional plastic at the point of collection. To prevent contamination of composting streams, such bags are treated as reject waste.
For a Bulk Waste Generator, this can result in thousands of additional bags entering landfill every month.'),
  ('faq-11', 110, 'Bins & liners', 'Can newspapers be used as liners?', 'A small piece of paper at the bottom to absorb moisture is acceptable. Wet waste should ideally be handed over daily, and bins washed regularly.
Lining the entire bin fully with newspaper is discouraged.'),
  ('faq-13', 120, 'Bins & liners', 'Can liners be used for reject waste?', 'It is sufficient to securely wrap reject waste in paper and place it directly into the designated reject bin. Liners are not required for routine household reject waste.
Please note: Reject waste is ultimately sent for final disposal, typically to landfill. Every unnecessary plastic bag used adds to the already overburdened landfill situation.'),
  ('faq-14', 130, 'Bins & liners', 'When can liners be used?', 'If a liner must be used for hygiene reasons — for example, in the case of certain household medical waste (not sanitary waste such as diapers or sanitary napkins) — please use the smallest available bag and ensure it is securely tied.
Liners may be advisable for large-volume community waste handling, but are not recommended for routine individual household disposal.'),
  ('faq-14-1', 140, 'Bins & liners', 'What should be done with the liners already purchased?', 'The liners can still be put to practical use. They may be used for disposing of pet waste, for laundry storage, or for packing shoes during travel. They may also be donated to nearby small clinics where appropriate.
The Association is exploring additional options and will share an update shortly.'),
  ('faq-12', 150, 'Special cases', 'Why is biodegradable / compostable cutlery not treated as wet waste?', 'Such items are not the same as kitchen waste and typically require industrial composting conditions.
If clean and dry, treat as dry waste; if soiled, treat as reject waste.
If it is not food or natural organic matter, it does not belong in the wet waste stream.'),
  ('faq-15', 160, 'Special cases', 'How should pet waste (pet poop or cat litter) be disposed of?', 'Preferably dispose in designated community pet waste bins.
Otherwise, place in a securely tied garbage bag (preferably red) and dispose in the Reject bin.'),
  ('faq-16', 170, 'Special cases', 'How should unbroken but fragile items be disposed of?', 'It is preferable to give such items away for reuse — for example, to crafters, helpers, or through the donation drives conducted periodically. This includes items such as glass bottles, flower pots, and similar fragile household articles that are still intact.
If you must dispose of them with regular waste, keep them separate and place them unwrapped in a sturdy box with appropriate fillers, so collectors can clearly see the contents and handle them with care.'),
  ('faq-17', 180, 'Special cases', 'Where should hazardous waste, fabric waste, and broken footwear be handed over?', 'Hazardous waste must be handed over at the designated collection points that will be set up across the campus. Details will be shared soon.
Fabric waste should be washed before disposal to ensure the safety of workers at Textile Recovery Facilities (TRF) and to enable repurposing.
Periodic special collection drives for fabric waste and broken footwear are being considered. Details will be shared in due course.'),
  ('faq-18', 190, 'Special cases', 'What is the process to follow when hosting parties or gatherings at home?', 'When hosting a party or gathering, residents are required to ensure proper waste segregation during and after the event:
• Arrange separate bins for Wet Waste and Dry Waste for guests.
• Prefer reusable cutlery and crockery wherever possible.
• If disposables are necessary, opt for leaf-based or fully compostable disposables, so the waste remains within the wet waste stream.
If non-organic disposables are used (such as paper plates or water glasses):
• Soiled paper plates and food-contaminated items must be collected separately and handed over as instructed.
• Used but clean water glasses may be disposed of as Dry Waste.
• Glasses used for juice or other beverages must be collected separately and handed over along with the soiled items.
Proper segregation during events ensures that bulk waste does not disrupt the overall waste management process of the community.'),
  ('faq-19', 200, 'Special cases', 'Can we place items in good condition for donation along with the waste for collectors?', 'No. Such items can easily be mistaken for dry waste.
Please hand them over directly or contribute during donation drives.'),
  ('faq-20', 210, 'Collection', 'What should I do if the waste is not collected from my doorstep, even though I''m not a defaulter?', 'Please take the bins back in and keep them out the next day. The collectors might have missed your bin.
In case of frequent or continued non-collection, please notify your block volunteer for sustainability. They will inform the collector.'),
  ('faq-21', 220, 'Collection', 'What are the timings of waste collection?', 'Door-to-door garbage collection takes place between 4 AM and 7 AM.'),
  ('faq-22', 230, 'Collection', 'Where should the waste be kept?', 'All bins and waste should be kept just outside your door.
They should not be kept in the fire escape stairwell or obstruct anyone''s passage.'),
  ('faq-why', 240, 'Why it matters', 'Why does all this matter?', 'Waste doesn’t just disappear once it leaves our homes. Much of it ends up in landfills that are not far from the mainland, where it is often burned openly. This releases harmful smoke and pollutants into the air we breathe. Otherwise they are sent to illegal dump yards where chemicals are released and harmful leachate seeps into the soil, poisoning it. This finally joins the ground water, making the water table of the whole area toxic.
Our actions are only backfiring on us. The rising incidents of pollution-related health issues are all too evident in our daily lives. From air pollution-induced deteriorating respiratory issues, to breathing in carcinogens from the burning of plastics and rubber, to the presence of contaminated water in and around us.
This is not about saving the planet. This is about protecting us, our health, our communities, and the places we call home.
The change begins at the bin.')
on conflict (id) do nothing;

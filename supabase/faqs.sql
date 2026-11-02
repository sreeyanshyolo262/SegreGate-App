-- Adds the FAQs table. Paste this whole file into: Supabase dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once: existing FAQs are left alone.

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

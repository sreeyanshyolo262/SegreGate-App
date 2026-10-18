// Society knowledge base: guidelines + FAQs.
// Shape mirrors what the admin dashboard will upload (one row per entry), so the
// backend can later swap this file for an API call and embeddings-based retrieval.
export interface KbEntry {
  id: string;
  category: "Wet waste" | "Dry waste" | "Reject waste" | "E-waste" | "Pickup" | "General";
  question: string;
  answer: string;
  keywords?: string[];
  source: string; // document the entry came from, shown to residents
  updatedAt: string;
}

const SRC = "Society waste guidelines";

// Bundled copy, used until (or unless) the live guidelines load from the server.


export const SEED_KB: KbEntry[] = [
  { id: "wet-1", category: "Wet waste", question: "What goes in the green (wet) bin?",
    answer: "Fruit and vegetable peels, cooked food and leftovers (veg and non-veg), egg shells, chicken and fish bones, rotten produce, tea bags and coffee grounds (no staples), food-soiled tissue, and garden or puja waste like leaves, flowers and garlands.",
    keywords: ["green", "wet", "compost", "organic", "kitchen"], source: SRC, updatedAt: "2026-10-01" },
  { id: "wet-2", category: "Wet waste", question: "What should never go in the wet bin?",
    answer: "Plastic, foil, glass, metal, rubber bands, stapler pins and non-cotton strings. Remove the thread from garlands before putting them in.",
    keywords: ["not", "contaminate", "avoid"], source: SRC, updatedAt: "2026-10-01" },
  { id: "dry-1", category: "Dry waste", question: "What goes in the blue (dry) bin?",
    answer: "Clean and dry paper, cardboard, cartons, plastic bottles, containers and wrappers, milk packets, metal cans and tins, unbroken glass bottles and jars, rubber, thermocol, old mops and sponges, ceramics, wood and coconut shells.",
    keywords: ["blue", "dry", "recycle", "recycling", "plastic", "paper"], source: SRC, updatedAt: "2026-10-01" },
  { id: "dry-2", category: "Dry waste", question: "Do I need to wash dry waste before throwing it?",
    answer: "Yes. Rinse and dry anything that is food-soiled, like milk packets and containers. Oil packets only need to be fully drained. Items that cannot be cleaned go in the red bin.",
    keywords: ["wash", "clean", "rinse", "soiled", "greasy", "pizza"], source: SRC, updatedAt: "2026-10-01" },
  { id: "rej-1", category: "Reject waste", question: "What goes in the red (reject) bin?",
    answer: "Diapers, sanitary napkins, used tissues, bandages, condoms, expired medicines, swept dust, hair, and heavily soiled plastic or paper that cannot be cleaned. Wrap sanitary items in newspaper.",
    keywords: ["red", "reject", "landfill", "sanitary", "diaper", "medicine"], source: SRC, updatedAt: "2026-10-01" },
  { id: "rej-2", category: "Reject waste", question: "How do I dispose sharps like blades, razors and syringes?",
    answer: "Wrap them in newspaper and hand them to the collector separately. Do not put them loose in any bin.",
    keywords: ["blade", "razor", "syringe", "needle", "sharp"], source: SRC, updatedAt: "2026-10-01" },
  { id: "rej-3", category: "Reject waste", question: "What do I do with broken glass?",
    answer: "Wrap it in newspaper, keep it separate from the bins and tell the collector. Unbroken glass bottles and jars go in the dry bin.",
    keywords: ["glass", "broken"], source: SRC, updatedAt: "2026-10-01" },
  { id: "rej-4", category: "Reject waste", question: "How do I dispose paint, solvents and chemicals?",
    answer: "These are hazardous waste. Keep them in their container and hand them over separately. Never mix them with other waste.",
    keywords: ["paint", "chemical", "solvent", "hazardous"], source: SRC, updatedAt: "2026-10-01" },
  { id: "ew-1", category: "E-waste", question: "How do I dispose batteries, bulbs and electronics?",
    answer: "Batteries, CDs, thermometers, bulbs, tube lights and CFLs are e-waste. Do not put them in the bins. Hand them over separately to the collector or the e-waste drop point.",
    keywords: ["battery", "batteries", "bulb", "cfl", "tubelight", "electronic", "charger", "cable", "phone"], source: SRC, updatedAt: "2026-10-01" },
  { id: "gen-1", category: "General", question: "Can I use plastic bags to line the wet bin?",
    answer: "No. Plastic contaminates compost. Use newspaper or put the waste in directly.",
    keywords: ["bag", "liner", "line", "polythene", "plastic"], source: SRC, updatedAt: "2026-10-01" },
  { id: "gen-2", category: "General", question: "Where do tea bags and coffee grounds go?",
    answer: "Wet bin, as long as the tea bag has no staple and is not plastic mesh.",
    keywords: ["tea", "coffee", "teabag"], source: SRC, updatedAt: "2026-10-01" },
  { id: "gen-3", category: "General", question: "Where do pizza boxes go?",
    answer: "A clean box goes in the dry bin. If it is greasy or food-soiled, tear off the clean part for dry and put the soiled part in the red bin.",
    keywords: ["pizza", "box", "cardboard", "greasy"], source: SRC, updatedAt: "2026-10-01" },
];

let current: KbEntry[] = SEED_KB;
export const setKb = (e: KbEntry[]) => { current = e; };
export const getKb = () => current;

const STOP = new Set("a an the is are do does i my me we to of in on for and or can how what where which it this that go goes with be at".split(" "));

const stem = (w: string) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "");
const tokens = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);

export interface KbHit { entry: KbEntry; score: number }

// Keyword retrieval. The same interface will be backed by vector search once the API exists.
export function searchKb(query: string, entries: KbEntry[] = current, minScore = 3): KbHit[] {
  const q = tokens(query);
  if (!q.length) return [];
  return entries
    .map((entry) => {
      const kw = new Set((entry.keywords ?? []).flatMap(tokens));
      const qn = new Set(tokens(entry.question));
      const an = new Set(tokens(entry.answer));
      let score = 0;
      for (const t of q) score += (kw.has(t) ? 3 : 0) + (qn.has(t) ? 2 : 0) + (an.has(t) ? 1 : 0);
      return { entry, score };
    })
    .filter((h) => h.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

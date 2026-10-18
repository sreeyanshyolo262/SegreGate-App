import type { Bin } from "./data";

export interface Classification {
  bin: Bin;
  title: string;
  reason: string;
  tip: string;
  confidence: number;
  source: "rules" | "api";
}

// Offline-first rule table derived from the original Groq prompt.
const RULES: { bin: Bin; words: string[]; reason: string; tip: string }[] = [
  { bin: "reject", words: ["diaper", "napkin", "sanitary", "tissue", "bandage", "syringe", "blade", "razor", "medicine", "paint", "hair", "broken glass", "condom"],
    reason: "Sanitary, medical or hazardous items can't be recycled or composted.", tip: "Wrap in newspaper and hand it to the collector separately." },
  { bin: "wet", words: ["peel", "banana", "vegetable", "fruit", "leftover", "food", "egg", "bone", "tea", "coffee", "flower", "garland", "leaf", "leaves", "rice", "roti", "rotten"],
    reason: "Biodegradable kitchen or garden waste goes to composting.", tip: "No plastic bags, rubber bands or staples with it." },
  { bin: "dry", words: ["bottle", "plastic", "paper", "newspaper", "cardboard", "carton", "tetra", "can", "tin", "wrapper", "packet", "glass", "jar", "box", "cup", "bag", "foil", "thermocol"],
    reason: "Clean paper, plastic, metal and glass can be recycled.", tip: "Rinse and dry it first so it doesn't contaminate the batch." },
  { bin: "dry", words: ["battery", "bulb", "cfl", "charger", "cable", "e-waste", "phone"],
    reason: "E-waste is dry waste but needs separate handover.", tip: "Give it to the collector or society e-waste drop, not the bin." },
];

export function classifyLocal(item: string): Classification | null {
  const q = item.toLowerCase();
  for (const r of RULES) {
    const hit = r.words.find((w) => q.includes(w));
    if (hit) {
      return { bin: r.bin, title: item.trim(), reason: r.reason, tip: r.tip, confidence: 0.82, source: "rules" };
    }
  }
  return null;
}

const API = import.meta.env.VITE_API_URL as string | undefined;

function parseLLM(item: string, text: string): Classification | null {
  const t = text.toLowerCase();
  const bin: Bin | null = t.startsWith("green") ? "wet" : t.startsWith("dry") ? "dry" : t.startsWith("reject") ? "reject" : null;
  if (!bin) return null;
  const body = text.split(/\s[-–]\s/).slice(1).join(" - ") || text;
  return { bin, title: item, reason: body, tip: "", confidence: 0.9, source: "api" };
}

export async function classify(item: string): Promise<Classification | { question: string } | null> {
  if (API) {
    try {
      const r = await fetch(`${API}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waste: item }),
      });
      const j = await r.json();
      const text: string = j.classification ?? "";
      if (text.toLowerCase().startsWith("i need more details")) return { question: text.replace(/^i need more details\s*-?\s*/i, "") };
      const parsed = parseLLM(item, text);
      if (parsed) return parsed;
    } catch {
      /* fall through to local rules */
    }
  }
  return classifyLocal(item);
}

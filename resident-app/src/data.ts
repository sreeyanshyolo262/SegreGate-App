// Mock resident data. Replaced by the SegreGate backend API in a later phase.
export type Bin = "wet" | "dry" | "reject";

export const BINS: Record<Bin, { label: string; sub: string; color: string; bg: string; emoji: string }> = {
  wet: { label: "Wet waste", sub: "Green bin · composting", color: "#1f7a4a", bg: "#d4f6d9", emoji: "🌿" },
  dry: { label: "Dry waste", sub: "Blue bin · recycling", color: "#2563c9", bg: "#d3e6ff", emoji: "♻️" },
  reject: { label: "Reject waste", sub: "Red bin · landfill", color: "#d23f3f", bg: "#ffd5d5", emoji: "🚫" },
};

export const resident = {
  name: "Aarav Mehta",
  flat: "B-402",
  block: "Block B",
  society: "Green Meadows",
  city: "Bengaluru",
  score: 1840,
  weekDelta: 120,
  streak: 12,
  rank: { flat: 4, block: 2, society: 3, city: 17 },
  kgDiverted: 86.4,
  co2Saved: 41.2,
  nextPickup: { day: "Tomorrow", time: "7:30 – 8:30 am", type: "Wet + Dry" },
};

export const week = [
  { d: "M", v: 80, ok: true },
  { d: "T", v: 60, ok: true },
  { d: "W", v: 90, ok: true },
  { d: "T", v: 40, ok: false },
  { d: "F", v: 85, ok: true },
  { d: "S", v: 95, ok: true },
  { d: "S", v: 70, ok: true },
];

export const badges = [
  { name: "Zero Contamination Month", emoji: "🏆", got: true },
  { name: "Compost Champion", emoji: "🌱", got: true },
  { name: "E-waste Hero", emoji: "🔋", got: true },
  { name: "30-day Streak", emoji: "🔥", got: false },
  { name: "Most Improved", emoji: "📈", got: false },
  { name: "Neighbour Mentor", emoji: "🤝", got: false },
];

export const history = [
  { when: "Today, 7:42 am", check: "clean" as const, note: "Wet bin · perfectly segregated", pts: 40 },
  { when: "Yesterday", check: "minor" as const, note: "Dry bin · 1 greasy wrapper", pts: 25 },
  { when: "Mon", check: "clean" as const, note: "Dry bin · rinsed & dry", pts: 40 },
];

export const notices = [
  { title: "Challenge: No plastic in wet waste", body: "Week 42 · 3 days left · +150 pts", tone: "butter" as const },
  { title: "Collection moved to 8 am on Sunday", body: "Municipal holiday schedule", tone: "sky" as const },
];

export const flats = [
  { name: "A-101", pts: 2210 },
  { name: "C-305", pts: 2095 },
  { name: "D-210", pts: 1960 },
  { name: "B-402", pts: 1840, me: true },
  { name: "A-204", pts: 1790 },
  { name: "C-112", pts: 1655 },
  { name: "B-110", pts: 1590 },
];

export const blocks = [
  { name: "Block A", pts: 8420 },
  { name: "Block B", pts: 8110, me: true },
  { name: "Block C", pts: 7860 },
  { name: "Block D", pts: 6930 },
];

export const societies = [
  { name: "Palm Residency", pts: 41200 },
  { name: "Lakeview Heights", pts: 39880 },
  { name: "Green Meadows", pts: 38410, me: true },
  { name: "Sunrise Enclave", pts: 36050 },
  { name: "Maple Court", pts: 33700 },
];

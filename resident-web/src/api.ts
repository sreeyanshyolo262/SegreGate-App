export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

// Blocks at Ajmera Infinity.
export const BLOCKS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "Villows"] as const;
export type Block = (typeof BLOCKS)[number];

export interface Announcement {
  id: number;
  type: "notice" | "event" | "challenge";
  title: string;
  body: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  pinned: boolean;
  createdAt: string;
}

export interface Answer {
  grounded: boolean;
  ai: boolean;
  answer: string | null;
  source: { name: string; updatedAt: string } | null;
  related: { id: string; question: string }[];
}

export interface Session { block: Block; flat: string }

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status})`);
  return data as T;
}

export const api = {
  login: (s: Session) => call<{ ok: boolean }>("/residents/login", s),
  announcements: () => call<Announcement[]>("/announcements"),
  ask: (question: string, s: Session) => call<Answer>("/ask", { question, ...s }),
};

const KEY = "sg-resident";
export function loadSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s && (BLOCKS as readonly string[]).includes(s.block) && /^\d{1,5}$/.test(s.flat) ? s : null;
  } catch { return null; }
}
export function saveSession(s: Session | null) {
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

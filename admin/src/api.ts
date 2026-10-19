export const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

export const CATEGORIES = ["Wet waste", "Dry waste", "Reject waste", "E-waste", "Pickup", "General"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Guideline {
  id: string;
  category: Category;
  question: string;
  answer: string;
  keywords: string[];
  source: string;
  updatedAt: string;
}

export type AnnType = "notice" | "event" | "challenge";
export interface Announcement {
  id: number;
  type: AnnType;
  title: string;
  body: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  pinned: boolean;
  createdAt: string;
}

export interface Stats {
  guidelines: number;
  announcements: number;
  residents: number;
  questionsWeek: number;
  answeredWeek: number;
  gaps: number;
  days: { date: string; asked: number; answered: number }[];
  gapList: { id: number; text: string; times: number; last: string; by: string | null }[];
}

let key = "";
try { key = sessionStorage.getItem("sg-admin-key") ?? ""; } catch { /* storage unavailable */ }

export const hasKey = () => !!key;
export function setKey(k: string) {
  key = k;
  try { k ? sessionStorage.setItem("sg-admin-key", k) : sessionStorage.removeItem("sg-admin-key"); } catch { /* ignore */ }
}

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Is it running on " + API + "?");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/admin/login") { setKey(""); location.reload(); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  login: (password: string) => call<{ ok: boolean }>("/admin/login", "POST", { password }),
  stats: () => call<Stats>("/admin/stats"),
  resolveGap: (text: string) => call("/admin/questions/resolve", "POST", { text }),
  guidelines: () => call<Guideline[]>("/guidelines"),
  saveGuideline: (g: Partial<Guideline>) => (g.id ? call<Guideline>(`/guidelines/${g.id}`, "PUT", g) : call<Guideline>("/guidelines", "POST", g)),
  deleteGuideline: (id: string) => call(`/guidelines/${id}`, "DELETE"),
  announcements: () => call<Announcement[]>("/announcements"),
  saveAnnouncement: (a: Partial<Announcement>) => (a.id ? call<Announcement>(`/announcements/${a.id}`, "PUT", a) : call<Announcement>("/announcements", "POST", a)),
  deleteAnnouncement: (id: number) => call(`/announcements/${id}`, "DELETE"),
};

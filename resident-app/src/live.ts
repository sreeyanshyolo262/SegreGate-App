import { useSyncExternalStore } from "react";
import { setKb, getKb, type KbEntry } from "./kb";

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

export const API = import.meta.env.VITE_API_URL as string | undefined;

// Small external store: the admin dashboard edits the server, and this keeps the app in sync with it.
let state = { announcements: [] as Announcement[], guidelines: getKb(), online: false, loaded: false };
const subs = new Set<() => void>();
const set = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };

export async function refresh() {
  if (!API) return;
  try {
    const [g, a] = await Promise.all([
      fetch(`${API}/api/guidelines`).then((r) => r.json() as Promise<KbEntry[]>),
      fetch(`${API}/api/announcements`).then((r) => r.json() as Promise<Announcement[]>),
    ]);
    if (Array.isArray(g) && g.length) setKb(g);
    set({ guidelines: getKb(), announcements: Array.isArray(a) ? a : [], online: true, loaded: true });
  } catch {
    set({ online: false, loaded: true });
  }
}

export const useLive = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);

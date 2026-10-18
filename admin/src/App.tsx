import { useState } from "react";
import { LayoutDashboard, BookOpen, Megaphone, LogOut, Leaf, Lock } from "lucide-react";
import { api, hasKey, setKey } from "./api";
import { Button, inputCls } from "./ui";
import Dashboard from "./pages/Dashboard";
import Guidelines from "./pages/Guidelines";
import Announcements from "./pages/Announcements";

const NAV = [
  { id: "dash", label: "Dashboard", icon: LayoutDashboard },
  { id: "guide", label: "Guidelines & FAQs", icon: BookOpen },
  { id: "news", label: "Announcements & Events", icon: Megaphone },
] as const;
export type Page = (typeof NAV)[number]["id"];

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api.login(pw); setKey(pw); onDone(); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-brand p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-xl font-semibold"><Leaf /> SegreGate</div>
        <div>
          <h2 className="text-4xl font-semibold leading-tight">Keep your society's waste rules clear, current and in every resident's pocket.</h2>
          <ul className="mt-8 space-y-3 text-white/90">
            <li>📖 Update guidelines and FAQs in one place</li>
            <li>📣 Post announcements and events</li>
            <li>💡 See what residents ask that you haven't answered yet</li>
          </ul>
        </div>
        <p className="text-sm text-white/70">Green Meadows · Admin console</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-white/10" />
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mb-8 mt-1 text-muted">Sign in to manage Green Meadows.</p>
          <label className="mb-1.5 block text-sm font-medium">Admin password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-3.5 text-muted" />
            <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className={`${inputCls} pl-10`} placeholder="••••••••" />
          </div>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <Button disabled={busy || !pw} className="mt-5 w-full py-3">{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(hasKey());
  const [page, setPage] = useState<Page>("dash");
  const [prefill, setPrefill] = useState<string | null>(null);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-dark p-4 text-white md:flex">
        <div className="mb-8 flex items-center gap-2 px-3 pt-2 text-xl font-semibold"><Leaf className="text-accent" /> SegreGate</div>
        <nav className="space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition ${page === id ? "bg-white/15" : "text-white/70 hover:bg-white/10"}`}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/10 p-4 text-sm">
          <p className="font-medium">Green Meadows</p>
          <p className="text-xs text-white/60">Bengaluru · Admin</p>
          <button onClick={() => { setKey(""); setAuthed(false); }} className="mt-3 flex items-center gap-2 text-xs text-white/80 hover:text-white"><LogOut size={14} />Sign out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex gap-1 overflow-x-auto border-b border-line bg-white p-2 md:hidden">
          {NAV.map(({ id, label }) => (
            <button key={id} onClick={() => setPage(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${page === id ? "bg-brand-soft text-brand-dark" : "text-muted"}`}>{label}</button>
          ))}
        </div>
        <main className="mx-auto max-w-6xl p-6 lg:p-10">
          {page === "dash" && <Dashboard go={setPage} addFromQuestion={(q) => { setPrefill(q); setPage("guide"); }} />}
          {page === "guide" && <Guidelines prefill={prefill} clearPrefill={() => setPrefill(null)} />}
          {page === "news" && <Announcements />}
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { refresh } from "./live";
import { Home, ScanLine, MessageCircle, Trophy, User } from "lucide-react";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import ChatScreen from "./screens/ChatScreen";
import RankScreen from "./screens/RankScreen";
import ProfileScreen from "./screens/ProfileScreen";

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Ask", icon: MessageCircle },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "rank", label: "Ranks", icon: Trophy },
  { id: "me", label: "Me", icon: User },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => { refresh(); }, [tab]);
  useEffect(() => {
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-cream">
      <main key={tab} className={`rise scroll-hide flex min-h-0 flex-1 flex-col ${tab === "chat" ? "overflow-hidden" : "overflow-y-auto pb-4"}`}>
        {tab === "home" && <HomeScreen go={(t) => setTab(t as Tab)} />}
        {tab === "scan" && <ScanScreen />}
        {tab === "chat" && <ChatScreen />}
        {tab === "rank" && <RankScreen />}
        {tab === "me" && <ProfileScreen />}
      </main>

      <nav className="mx-4 mb-4 flex items-center justify-between rounded-[26px] bg-ink px-3 py-2 shadow-lg">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = tab === id;
          const scan = id === "scan";
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition
                ${scan ? "-mt-6 h-14 w-14 justify-center rounded-full border-4 border-cream bg-leaf text-white" : on ? "text-butter" : "text-white/60"}`}>
              <Icon size={scan ? 24 : 21} strokeWidth={2.2} />
              {!scan && label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

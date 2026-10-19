import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { loadSession, saveSession, type Session } from "./api";

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);

  const signIn = (s: Session) => { saveSession(s); setSession(s); };
  const signOut = () => { saveSession(null); setSession(null); };

  return (
    <div className="mx-auto min-h-full max-w-[480px] bg-cream">
      {session ? <Dashboard session={session} onSignOut={signOut} /> : <Login onDone={signIn} />}
    </div>
  );
}

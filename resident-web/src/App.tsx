import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { loadSession, saveSession, type Session } from "./api";
import { morph } from "./motion";

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);

  // The welcome card glides into Bin-Buddy's card, and back again.
  const signIn = (s: Session) => { saveSession(s); morph(() => setSession(s), "login-morph"); };
  const signOut = () => { saveSession(null); morph(() => { window.scrollTo(0, 0); setSession(null); }, "login-morph"); };

  return (
    <div className="mx-auto min-h-full max-w-[480px]">
      {session ? <Dashboard session={session} onSignOut={signOut} /> : <Login onDone={signIn} />}
    </div>
  );
}

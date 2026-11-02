import { useEffect, useState } from "react";
import { EllipsisVertical, Share, SquarePlus, Smartphone, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome fires this once, possibly before React has mounted, so it is captured as soon as the app loads.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  listeners.forEach((f) => f());
});

const KEY = "sg-install-dismissed";
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const wasDismissed = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export function InstallStrip({ onNeedHelp }: { onNeedHelp: () => void }) {
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());
  const [, rerender] = useState(0);

  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    const installed = () => setHidden(true);
    listeners.add(update);
    window.addEventListener("appinstalled", installed);
    return () => { listeners.delete(update); window.removeEventListener("appinstalled", installed); };
  }, []);

  if (hidden) return null;

  async function install() {
    if (!deferred) return onNeedHelp();
    const e = deferred;
    deferred = null;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") setHidden(true);
  }
  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch { /* storage unavailable */ }
    setHidden(true);
  }

  return (
    <div className="rise mt-3 flex items-center rounded-[18px] border-2 border-dashed border-ink/35">
      <button onClick={install} className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3.5 text-left text-sm font-bold active:scale-[.98]">
        <Smartphone size={18} className="shrink-0" /> Add to home screen
      </button>
      <button onClick={dismiss} aria-label="Hide this" className="grid h-10 w-10 shrink-0 place-items-center text-ink/55"><X size={16} /></button>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-[15px] leading-snug">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-butter font-display text-sm font-extrabold">{n}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

// iPhones have no install prompt, and some Android browsers don't offer one, so these show the manual steps.
export function InstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50" role="dialog" aria-label="Add to home screen" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-up w-full max-w-[480px] rounded-t-[28px] border-2 border-b-0 border-ink bg-cream p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xl font-extrabold leading-tight">Add to your home screen</p>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-white"><X size={16} /></button>
        </div>
        <p className="mt-1 text-sm opacity-70">It opens like an app, with one tap.</p>
        <ol className="mt-4 space-y-3">
          {isIos() ? (
            <>
              <Step n={1}><span className="inline-flex flex-wrap items-center gap-1.5">Tap the <b>Share</b> button <Share size={16} /> in your browser</span></Step>
              <Step n={2}><span className="inline-flex flex-wrap items-center gap-1.5">Scroll down and tap <b>Add to Home Screen</b> <SquarePlus size={16} /></span></Step>
              <Step n={3}>Tap <b>Add</b></Step>
            </>
          ) : (
            <>
              <Step n={1}><span className="inline-flex flex-wrap items-center gap-1.5">Tap your browser's <b>menu</b> <EllipsisVertical size={16} /></span></Step>
              <Step n={2}>Tap <b>Add to Home screen</b> or <b>Install app</b></Step>
              <Step n={3}>Tap <b>Add</b> or <b>Install</b></Step>
            </>
          )}
        </ol>
        <p className="mt-4 text-[13px] leading-snug opacity-70">Opened this from WhatsApp? Open it in {isIos() ? "Safari" : "Chrome"} first, as these options may not show inside WhatsApp.</p>
      </div>
    </div>
  );
}

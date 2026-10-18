import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(22,38,31,.04)] ${className}`}>{children}</div>;
}

export function PageHeader({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-accent text-ink hover:brightness-95 font-semibold",
    ghost: "border border-line bg-white text-ink hover:bg-surface font-medium",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium",
  }[variant];
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50 ${v} ${className}`} />;
}

export const inputCls = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`pop w-full ${wide ? "max-w-4xl" : "max-w-xl"} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ msg, error }: { msg: string; error?: boolean }) {
  return (
    <div className={`pop fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${error ? "bg-red-600" : "bg-brand-dark"}`}>{msg}</div>
  );
}

export const fmtDate = (iso: string) => new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

import { ExternalLink } from "lucide-react";

const URL_RE = /(https?:\/\/\S+)/g;

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Open link"; }
}

// Makes links tappable. `pill` swaps a long URL for a short button showing only the site name.
export default function Linkified({ text, pill }: { text: string; pill?: boolean }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>;
        const url = part.replace(/[.,;:)\]]+$/, "");
        const rest = part.slice(url.length);
        return (
          <span key={i}>
            {pill ? (
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-ink bg-butter px-3 py-1 text-[13px] font-bold">
                <span className="truncate">{hostOf(url)}</span><ExternalLink size={13} className="shrink-0" />
              </a>
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2 [overflow-wrap:anywhere]">{url}</a>
            )}
            {rest}
          </span>
        );
      })}
    </>
  );
}

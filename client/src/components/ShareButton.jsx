import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export default function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title, text: `${title} — 0x00 SPACE`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* пользователь закрыл меню поделиться */
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="button-secondary"
      aria-live="polite"
    >
      <>{copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}</>
      {copied ? "Ссылка скопирована" : "Поделиться"}
    </button>
  );
}

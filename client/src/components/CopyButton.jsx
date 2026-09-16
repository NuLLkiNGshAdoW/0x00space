import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../lib/utils.js";
import { trackEvent } from "../lib/analytics.js";

/** Кнопка копирования текста в буфер обмена с кратковременным подтверждением. */
export default function CopyButton({ value, label = "Копировать" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      trackEvent("copy_seed_data", { label });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Буфер обмена недоступен (например, нет HTTPS) — молча игнорируем,
      // пользователь всё ещё может выделить и скопировать текст вручную.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
        copied
          ? "border-emerald/50 bg-emerald-soft text-emerald"
          : "border-line text-mute hover:border-emerald/40 hover:text-emerald",
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Скопировано" : label}
    </button>
  );
}

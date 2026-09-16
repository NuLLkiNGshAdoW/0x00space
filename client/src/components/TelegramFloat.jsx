import { Send, X } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "../lib/analytics.js";

export default function TelegramFloat() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-end gap-2 sm:bottom-5 sm:left-auto sm:right-5">
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Скрыть кнопку Telegram"
        className="rounded-full bg-void/80 p-1 text-mute backdrop-blur hover:text-ink"
      >
        <X className="h-3 w-3" />
      </button>
      <a
        href="https://t.me/space_0x00"
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent("telegram_open", { source: "floating_button" })}
        aria-label="Открыть Telegram-канал 0x00 SPACE"
        className="button-glow inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 sm:flex-none"
      >
        <Send className="h-4 w-4" /> Telegram-канал
      </a>
    </div>
  );
}

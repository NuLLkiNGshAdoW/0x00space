import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { trackEvent } from "../lib/analytics.js";

export default function TelegramFloat() {
  const [visible, setVisible] = useState(true);
  const [mobileScrolled, setMobileScrolled] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setMobileScrolled(window.innerWidth >= 640 || window.scrollY > 360);
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  if (!visible || !mobileScrolled) return null;
  return (
    <aside aria-label="Ссылки сообщества" className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-auto right-4 z-40 flex items-center gap-2 lg:bottom-5 lg:right-5">
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Скрыть кнопку Telegram"
        className="icon-button h-11 w-11 rounded-full bg-void/80 text-mute backdrop-blur"
      >
        <X className="h-3 w-3" />
      </button>
      <a
        href="https://t.me/space_0x00"
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent("telegram_open", { source: "floating_button" })}
        aria-label="Открыть Telegram-канал 0x00 SPACE"
        className="button-glow inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0878ad] px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        <Send className="h-4 w-4" /> <span className="hidden sm:inline">Telegram-канал</span>
      </a>
    </aside>
  );
}

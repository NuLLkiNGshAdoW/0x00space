import { Send, X } from "lucide-react";
import { useState } from "react";

export default function TelegramFloat() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
      <button type="button" onClick={() => setVisible(false)} aria-label="Скрыть кнопку Telegram" className="rounded-full bg-void/80 p-1 text-mute backdrop-blur hover:text-ink"><X className="h-3 w-3" /></button>
      <a href="https://t.me/space_0x00" target="_blank" rel="noreferrer" className="button-glow inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-105">
        <Send className="h-4 w-4" /> Telegram-канал
      </a>
    </div>
  );
}

import { useBackgroundAnimation } from "../lib/backgroundAnimation.js";

export default function BackgroundAnimationToggle({ compact = false }) {
  const [enabled, setEnabled] = useBackgroundAnimation();

  return (
    <button
      type="button"
      className={
        compact
          ? "interactive-control w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-panel2"
          : "interactive-control rounded-lg px-3 py-2 text-xs text-mute hover:bg-panel2 hover:text-ink"
      }
      aria-pressed={enabled}
      onClick={() => setEnabled(!enabled)}
      title="Настройка анимации декоративного фона"
    >
      Анимация фона: {enabled ? "Включена" : "Выключена"}
    </button>
  );
}

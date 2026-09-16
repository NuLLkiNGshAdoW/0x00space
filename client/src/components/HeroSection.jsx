import { Play, CalendarPlus, Youtube } from "lucide-react";

export default function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Тонкая координатная сетка на фоне — намёк на "координаты/мир", не декоративный шум */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fade bg-[size:44px_44px]"
        style={{ maskImage: "linear-gradient(to bottom, black, transparent 80%)" }}
      />
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-violet/10 blur-3xl" />

      <div className="container-app relative grid grid-cols-1 gap-14 py-20 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-32">
        {/* Текстовый блок */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-emerald-soft/40 px-3 py-1.5 text-xs text-emerald">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-emerald" />
            </span>
            новые ролики каждую неделю
          </div>

          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-ink sm:text-5xl lg:text-7xl">
            Minecraft, выживание, кооп и хорроры —
            <br />
            <span className="bg-gradient-to-r from-emerald via-teal-300 to-violet bg-clip-text text-transparent">на одной частоте эфира</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-mute sm:text-lg">
            0x00 SPACE — игровой контент, выживание, ивенты и приключения.
            Проходим Minecraft, кооперативные экшены и хорроры вместе с теми,
            кто это смотрит.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#videos"
              className="button-glow inline-flex items-center justify-center gap-2 rounded-lg bg-emerald px-6 py-3 text-sm font-semibold text-void transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Смотреть ролики
            </a>
            <a
              href="https://youtube.com/@0x00space?sub_confirmation=1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet/40 bg-violet-soft/20 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-violet hover:text-violet"
            >
              <Youtube className="h-4 w-4" />
              Подписаться на YouTube
            </a>
            <a
              href="#application"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-panel/60 px-6 py-3 text-sm font-medium text-ink backdrop-blur-md transition-colors hover:border-violet/50 hover:text-violet"
            >
              <CalendarPlus className="h-4 w-4" />
              Подать заявку на ивент
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6">
            <div>
              <strong className="font-display text-xl text-ink">∞</strong>
              <p className="mt-1 text-xs text-mute">идей для роликов</p>
            </div>
            <div>
              <strong className="font-display text-xl text-ink">24/7</strong>
              <p className="mt-1 text-xs text-mute">на связи с комьюнити</p>
            </div>
            <div>
              <strong className="font-display text-xl text-ink">1</strong>
              <p className="mt-1 text-xs text-mute">общая игровая частота</p>
            </div>
          </div>
        </div>

        {/* Графическая панель "сигнала" — единственный акцент с движением на странице */}
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <div className="glass glass-accent-border relative h-full w-full overflow-hidden rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.08)]">
            {/* Сканирующая линия */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-x-0 h-24 animate-scanline bg-gradient-to-b from-transparent via-emerald/10 to-transparent" />
            </div>

            {/* Концентрические "орбиты" */}
            <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full opacity-70">
              <circle cx="150" cy="150" r="60" stroke="rgba(16,185,129,0.35)" fill="none" strokeWidth="1" />
              <circle cx="150" cy="150" r="100" stroke="rgba(139,92,246,0.25)" fill="none" strokeWidth="1" />
              <circle cx="150" cy="150" r="140" stroke="rgba(148,163,184,0.15)" fill="none" strokeWidth="1" />
            </svg>

            <div className="absolute left-5 top-5 rounded-lg border border-emerald/20 bg-void/50 px-3 py-2 font-mono text-[10px] text-emerald backdrop-blur-sm">
              LIVE // 0x00
            </div>
            <div className="absolute right-5 top-1/2 rounded-lg border border-violet/20 bg-void/50 px-3 py-2 font-mono text-[10px] text-violet backdrop-blur-sm">
              CO-OP READY
            </div>

            {/* Читаемая "телеметрия" — тематическая, не выдаётся за реальную статистику */}
            <div className="absolute inset-x-4 bottom-4 rounded-lg border border-line bg-void/60 p-3 font-mono text-[11px] text-mute backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span>SIGNAL</span>
                <span className="text-emerald">STABLE</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>CHANNEL</span>
                <span className="text-ink">0x00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

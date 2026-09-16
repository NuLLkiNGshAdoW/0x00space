import { Play, CalendarPlus, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLatestVideos, LATEST_VIDEOS_QUERY_KEY } from "../services/api.js";
import { trackEvent } from "../lib/analytics.js";

export default function HeroSection() {
  const { data: latestVideo, isError } = useQuery({
    queryKey: LATEST_VIDEOS_QUERY_KEY,
    queryFn: () => getLatestVideos(12),
    select: (videos) => videos[0],
    retry: false,
  });
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
             новые истории и материалы
          </div>

          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-5xl lg:text-6xl">
            Minecraft, выживание,
            <span className="block text-ink">
              кооп и хорроры
            </span>
            <span className="mt-1 block text-ink">на одной частоте эфира</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink sm:text-lg">
            0x00 SPACE — игровой контент, выживание, ивенты и приключения. Проходим Minecraft,
            кооперативные экшены и хорроры вместе с теми, кто это смотрит.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/videos"
              className="button-primary button-glow"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Смотреть ролики
            </Link>
            <a
              href="https://youtube.com/@0x00space?sub_confirmation=1"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("youtube_open", { source: "hero" })}
              className="button-secondary border-violet/40 bg-violet-soft/20 hover:border-violet hover:text-violet"
            >
              <Youtube className="h-4 w-4" />
              Подписаться на YouTube
            </a>
            <a
              href="#application"
              className="button-secondary bg-panel/60 hover:border-violet/50 hover:text-violet"
            >
              <CalendarPlus className="h-4 w-4" />
              Подать заявку на ивент
            </a>
          </div>

          <div className="mt-10 border-t border-line pt-6">
            {latestVideo ? (
              <Link to={`/videos/${latestVideo.video_id}`} className="group inline-flex max-w-xl items-center gap-3 text-left">
                 <img src={latestVideo.thumbnail_url} alt="" width="480" height="270" loading="lazy" decoding="async" className="h-14 w-24 rounded-lg object-cover" />
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-emerald">Последний ролик</span>
                  <span className="mt-1 block line-clamp-2 text-sm font-medium text-ink group-hover:text-emerald">{latestVideo.title}</span>
                </span>
                <Play className="ml-auto h-4 w-4 shrink-0 text-emerald" fill="currentColor" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-sm text-ink">
                {isError ? "Свежие ролики временно недоступны." : "Загружаем последний ролик с канала…"}
              </p>
            )}
          </div>
        </div>

        {/* Графическая панель "сигнала" — единственный акцент с движением на странице */}
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <div className="glass glass-accent-border relative h-full w-full overflow-hidden rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.08)]">
             <img
               src="/brand-logo-transparent.png"
               alt=""
               aria-hidden="true"
               width="1200"
               height="675"
               loading="eager"
               decoding="async"
               className="pointer-events-none absolute inset-0 h-full w-full object-contain object-[70%_50%] opacity-[0.18] mix-blend-screen"
            />
            {/* Сканирующая линия */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-x-0 h-24 animate-scanline bg-gradient-to-b from-transparent via-emerald/10 to-transparent" />
            </div>

            {/* Концентрические "орбиты" */}
            <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full opacity-70">
              <circle
                cx="150"
                cy="150"
                r="60"
                stroke="rgba(16,185,129,0.35)"
                fill="none"
                strokeWidth="1"
              />
              <circle
                cx="150"
                cy="150"
                r="100"
                stroke="rgba(139,92,246,0.25)"
                fill="none"
                strokeWidth="1"
              />
              <circle
                cx="150"
                cy="150"
                r="140"
                stroke="rgba(148,163,184,0.15)"
                fill="none"
                strokeWidth="1"
              />
            </svg>

             <div className="absolute left-5 top-5 rounded-lg border border-emerald/20 bg-void/70 px-3 py-2 font-mono text-[10px] text-emerald backdrop-blur-sm">
               0x00 SPACE
             </div>
             <div className="absolute right-5 top-1/2 rounded-lg border border-violet/20 bg-void/70 px-3 py-2 font-mono text-[10px] text-violet backdrop-blur-sm">
               ИГРАЕМ ВМЕСТЕ
            </div>

             {/* Подпись уточняет, что панель ведёт к реальному контенту канала. */}
              <div className="absolute inset-x-4 bottom-4 rounded-lg border border-line bg-void p-3 font-mono text-[11px] text-ink">
               <div className="flex items-center justify-between">
                 <span>ФОРМАТ</span>
                 <span className="text-emerald">ВИДЕО</span>
               </div>
               <div className="mt-1 flex items-center justify-between">
                 <span>ТЕМЫ</span>
                 <span className="text-ink">ИГРЫ / ИВЕНТЫ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

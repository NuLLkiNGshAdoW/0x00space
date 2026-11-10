import { ArrowUpRight, CalendarPlus, PackageOpen, Play, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLatestVideos, LATEST_VIDEOS_QUERY_KEY } from "../services/api.js";
import { trackEvent } from "../lib/analytics.js";
import { formatDuration } from "../lib/utils.js";
import ApiState from "./ApiState.jsx";

const PILLARS = [
  { icon: Youtube, title: "Новые видео", text: "каждую неделю", tone: "text-emerald" },
  { icon: PackageOpen, title: "Гайды и сиды", text: "из роликов", tone: "text-violet" },
  { icon: CalendarPlus, title: "Ивенты", text: "по заявке", tone: "text-amber" },
];

export default function HeroSection() {
  const {
    data: latestVideo,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: LATEST_VIDEOS_QUERY_KEY,
    queryFn: () => getLatestVideos(12),
    select: (videos) => videos[0],
    retry: 1,
  });

  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-grid-fade bg-[size:44px_44px] opacity-30 max-sm:opacity-15"
      />
      <div className="pointer-events-none absolute -left-40 top-10 z-0 h-96 w-96 rounded-full bg-emerald/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-0 z-0 h-[28rem] w-[28rem] rounded-full bg-violet/10 blur-3xl" />

      <div className="container-app relative grid grid-cols-1 gap-12 py-14 sm:py-20 lg:grid-cols-[1.06fr_.94fr] lg:items-center lg:gap-16 lg:py-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-emerald/25 bg-emerald-soft/50 px-3.5 py-1.5 text-xs text-emerald">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-emerald" />
            </span>
            Новые истории и материалы
          </div>

          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl lg:text-7xl">
            <span className="sr-only">Minecraft, выживание — </span>
            <span className="text-emerald">Minecraft</span>,{" "}
            <span className="text-violet">кооп</span>
            <span className="block">
              и <span className="text-emerald">хорроры</span>
            </span>
            <span className="mt-2 block text-ink">на одной частоте.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-mute sm:text-lg">
            0x00 SPACE — игровой портал для тех, кто любит атмосферные прохождения, честные гайды и
            совместные приключения. Смотрим, играем и собираемся в одну команду.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/videos" className="button-primary button-glow whitespace-nowrap">
              <Play className="h-4 w-4" fill="currentColor" />
              Смотреть ролики
            </Link>
            <Link to="/materials" className="button-secondary whitespace-nowrap">
              <PackageOpen className="h-4 w-4" />
              Материалы и сиды
            </Link>
            <a href="#application" className="button-ghost whitespace-nowrap">
              <CalendarPlus className="h-4 w-4" />
              Подать заявку
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mute">
            <a
              href="https://youtube.com/@0x00space?sub_confirmation=1"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("youtube_open", { source: "hero" })}
              className="inline-flex items-center gap-2 text-mute transition-colors hover:text-violet"
            >
              <Youtube className="h-4 w-4" />
              Подписаться на YouTube
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
            <span>Без спама. Только игры и атмосфера.</span>
          </div>

          <dl className="mt-9 grid grid-cols-3 gap-2">
            {PILLARS.map(({ icon: Icon, title, text, tone }) => (
              <div
                key={title}
                className="rounded-2xl border border-line/70 bg-panel/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-emerald/35 sm:px-4"
              >
                <dt className="flex min-h-10 flex-col justify-between gap-2 text-[11px] font-semibold leading-tight text-ink sm:flex-row sm:items-center sm:text-sm">
                  <Icon className={`h-4 w-4 shrink-0 ${tone}`} strokeWidth={1.8} />
                  <span className="sm:ml-auto">{title}</span>
                </dt>
                <dd className="mt-1.5 text-[10px] text-mute sm:text-xs">{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-emerald/5 blur-3xl"
          />
          <div className="glass glass-accent-border relative isolate overflow-hidden rounded-[2rem] p-2 shadow-2xl shadow-black/40">
            <div className="relative overflow-hidden rounded-[1.6rem] bg-void/80">
              <img
                src="/brand-logo-transparent.png"
                alt=""
                aria-hidden="true"
                width="1200"
                height="675"
                loading="eager"
                decoding="async"
                className="pointer-events-none absolute -right-16 top-0 w-[135%] max-w-none object-contain opacity-25 mix-blend-screen"
              />
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-void/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                    Свежий выпуск
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                    0x00 / 01
                  </span>
                </div>

                {latestVideo ? (
                  <Link
                    to={`/videos/${latestVideo.video_id}`}
                    aria-label={latestVideo.title}
                    className="group mt-4 block rounded-2xl focus-visible:outline-offset-4"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-panel2">
                      <img
                        src={latestVideo.thumbnail_url}
                        alt=""
                        width="480"
                        height="270"
                        loading="eager"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-void/10 to-transparent" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-void/65 text-ink shadow-xl backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                        </span>
                      </span>
                      <span className="absolute bottom-3 right-3 rounded-md bg-void/85 px-2 py-1 font-mono text-[11px] text-ink">
                        {formatDuration(latestVideo.duration_seconds)}
                      </span>
                      {latestVideo.is_short && (
                        <span className="absolute left-3 top-3 rounded-full bg-violet/90 px-2.5 py-1 text-[11px] font-medium text-void">
                          Shorts
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald">
                          Последний ролик
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors group-hover:text-emerald">
                          {latestVideo.title}
                        </p>
                      </div>
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-mute transition-colors group-hover:border-emerald/50 group-hover:text-emerald">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="mt-4">
                    <div className="media-fallback relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-line">
                      <span className="relative z-10 flex items-center gap-2 text-sm text-mute">
                        <Play className="h-4 w-4" />
                        Новый выпуск скоро
                      </span>
                    </div>
                    <div className="mt-4">
                      {isError ? (
                        <ApiState status="error" error={error} onRetry={refetch} compact />
                      ) : (
                        <ApiState
                          status={isPending ? "loading" : "empty"}
                          message="Свежие ролики пока недоступны."
                          compact
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line/80 pt-4">
                  {[
                    ["Формат", "Видео"],
                    ["Темы", "Игры"],
                    ["Режим", "Co-op"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-void/35 px-2.5 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute">
                        {label}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

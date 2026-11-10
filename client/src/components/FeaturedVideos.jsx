import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Play } from "lucide-react";
import { getLatestVideos, LATEST_VIDEOS_QUERY_KEY } from "../services/api.js";
import { trackEvent } from "../lib/analytics.js";
import { formatDuration, formatRelativeDate, formatViews } from "../lib/utils.js";
import { Link } from "react-router-dom";

export default function FeaturedVideos() {
  const { data: videos = [], isPending } = useQuery({
    queryKey: LATEST_VIDEOS_QUERY_KEY,
    queryFn: () => getLatestVideos(12),
    select: (items) => items.slice(0, 3),
  });

  return (
    <section aria-labelledby="featured-title" className="container-app pb-16 pt-4 sm:pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Сейчас в эфире</p>
          <h2
            id="featured-title"
            className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          >
            Свежие публикации
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-mute">
            Выбирай приключение на вечер: выживание, кооперативные игры и хорроры. Новые публикации
            — в одном месте.
          </p>
        </div>
        <Link to="/videos" className="button-secondary hidden self-start sm:inline-flex">
          Все видео
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {isPending &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass aspect-[4/3] animate-pulse rounded-2xl" />
          ))}

        {videos.map((video, index) => (
          <Link
            key={video.video_id}
            to={`/videos/${video.video_id}`}
            onClick={() =>
              trackEvent("video_open", { video_id: video.video_id, source: "featured" })
            }
            className="video-feature-card group relative overflow-hidden rounded-2xl border border-line bg-panel/70 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald/50 hover:shadow-[0_24px_60px_-24px_rgba(52,211,153,0.35)]"
          >
            <div className="relative aspect-video overflow-hidden bg-panel2">
              <img
                src={video.thumbnail_url}
                alt=""
                width="480"
                height="270"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchpriority={index === 0 ? "high" : undefined}
                onError={(event) => {
                  event.currentTarget.classList.add("opacity-0");
                }}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                <span className="rounded-md bg-void/80 px-2 py-1 font-mono text-[11px] text-ink">
                  {formatDuration(video.duration_seconds)}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald text-void shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                </span>
              </span>
              {video.is_short && (
                <span className="absolute left-3 top-3 rounded-full bg-violet/90 px-2.5 py-1 text-[11px] font-medium text-void">
                  Shorts
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors group-hover:text-emerald">
                {video.title}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-mute">
                <span>{formatViews(video.view_count)}</span>
                <span className="h-1 w-1 rounded-full bg-line" />
                <span>{formatRelativeDate(video.published_at)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link to="/videos" className="button-secondary mt-5 inline-flex sm:hidden">
        Все видео
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

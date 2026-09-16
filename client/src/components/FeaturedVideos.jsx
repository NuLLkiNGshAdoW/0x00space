import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Play } from "lucide-react";
import { LATEST_VIDEOS_QUERY_KEY } from "../services/api.js";
import { trackEvent } from "../lib/analytics.js";
import { Link } from "react-router-dom";

export default function FeaturedVideos() {
  const { data: videos = [] } = useQuery({
    queryKey: LATEST_VIDEOS_QUERY_KEY,
    select: (videos) => videos.slice(0, 3),
  });
  if (!videos.length) return null;
  return (
    <section
      aria-labelledby="featured-title"
      className="container-app -mt-4 hidden pb-16 sm:block sm:-mt-8 sm:pb-20"
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
            Сейчас в эфире
          </p>
          <h2
            id="featured-title"
            className="font-display text-2xl font-semibold text-ink sm:text-3xl"
          >
             Свежие публикации
          </h2>
        </div>
        <Link
          to="/videos"
          className="hidden items-center gap-1 text-sm text-ink hover:text-emerald sm:inline-flex"
        >
          Все видео <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {videos.map((video, index) => (
          <a
            key={video.video_id}
            href={video.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("youtube_open", { video_id: video.video_id, source: "featured" })}
            className="group relative overflow-hidden rounded-2xl border border-line bg-panel/70 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald/50"
          >
             <img
               src={video.thumbnail_url}
               alt={video.title}
               width="480"
               height="270"
             loading={index === 0 ? "eager" : "lazy"}
             fetchPriority={index === 0 ? "high" : "auto"}
             decoding="async"
              className="aspect-video w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
            <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
               <span className="line-clamp-2 text-sm font-medium leading-snug text-ink">
                {video.title}
              </span>
              <span className="shrink-0 rounded-full bg-emerald p-2 text-void">
                <Play className="h-3.5 w-3.5" fill="currentColor" />
              </span>
            </span>
          </a>
        ))}
      </div>
      <Link
        to="/videos"
        className="mt-5 inline-flex items-center gap-1 text-sm text-ink hover:text-emerald sm:hidden"
      >
        Все видео <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

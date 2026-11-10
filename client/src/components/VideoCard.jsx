import { ArrowUpRight, Clock3, Eye, ImageOff, Play } from "lucide-react";
import { useState } from "react";
import { formatDuration, formatViews, formatRelativeDate } from "../lib/utils.js";
import { trackEvent } from "../lib/analytics.js";
import { Link } from "react-router-dom";
import Card from "./Card.jsx";

export default function VideoCard({ video }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isNew = Date.now() - new Date(video.published_at).getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Card
      as={Link}
      to={`/videos/${video.video_id}`}
      onClick={() => trackEvent("video_open", { video_id: video.video_id })}
      interactive
      className="video-card group flex h-full flex-col"
    >
      <div className="relative aspect-video overflow-hidden border-b border-line/70 bg-panel2">
        {imageFailed ? (
          <div className="media-fallback relative flex h-full w-full flex-col items-center justify-center gap-2 text-mute">
            <ImageOff className="relative z-10 h-7 w-7" aria-hidden="true" />
            <span className="relative z-10 font-mono text-[10px] uppercase tracking-[0.16em]">
              Превью недоступно
            </span>
          </div>
        ) : (
          <img
            src={video.thumbnail_url}
            alt=""
            width="480"
            height="270"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-void/75 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-void/60 text-ink opacity-90 shadow-xl backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald group-hover:text-void">
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
          </span>
        </div>

        <span className="absolute bottom-2 right-2 rounded-md bg-void/85 px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {formatDuration(video.duration_seconds)}
        </span>

        {video.is_short && (
          <span className="absolute left-2 top-2 rounded-full bg-violet/90 px-2 py-0.5 text-[11px] font-medium text-void">
            Shorts
          </span>
        )}
        {isNew && !video.is_short && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald px-2 py-0.5 text-[11px] font-semibold text-void">
            Новое
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-emerald">
          {video.title}
        </h3>
        <div className="mt-auto flex items-center gap-3.5 pt-3 font-mono text-[11px] text-mute">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatViews(video.view_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatRelativeDate(video.published_at)}
          </span>
          <ArrowUpRight className="ml-auto h-4 w-4 text-mute transition-colors group-hover:text-emerald" />
        </div>
      </div>
    </Card>
  );
}

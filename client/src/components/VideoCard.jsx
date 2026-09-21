import { Play, Eye, Clock3, ImageOff } from "lucide-react";
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
      className="group h-full"
    >
      <div className="relative aspect-video overflow-hidden bg-panel2">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-panel2 to-void text-mute">
            <ImageOff className="h-7 w-7" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
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
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-void/0 transition-colors group-hover:bg-void/40">
          <Play className="h-10 w-10 text-ink drop-shadow-lg" fill="currentColor" />
        </div>

        <span className="absolute bottom-2 right-2 rounded bg-void/85 px-1.5 py-0.5 font-mono text-[11px] text-ink">
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
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">{video.title}</h3>
        <div className="mt-auto flex items-center gap-3.5 pt-3 font-mono text-xs text-mute">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatViews(video.view_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />
            {formatRelativeDate(video.published_at)}
          </span>
        </div>
      </div>
    </Card>
  );
}

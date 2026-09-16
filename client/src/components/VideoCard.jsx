import { Play, Eye, Clock3 } from "lucide-react";
import { formatDuration, formatViews, formatRelativeDate } from "../lib/utils.js";
import { trackEvent } from "../lib/analytics.js";
import { Link } from "react-router-dom";
import Card from "./Card.jsx";

export default function VideoCard({ video }) {
  return (
    <Card
      as={Link}
      to={`/videos/${video.video_id}`}
      onClick={() => trackEvent("video_open", { video_id: video.video_id })}
      interactive
      className="group"
    >
      <div className="relative aspect-video overflow-hidden bg-panel2">
         <img
           src={video.thumbnail_url}
           alt={video.title}
           width="480"
           height="270"
          loading="lazy"
           decoding="async"
           onError={(event) => { event.currentTarget.hidden = true; }}
           className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute inset-0 flex items-center justify-center bg-void transition-colors group-hover:bg-void">
          <Play
            className="h-10 w-10 text-ink drop-shadow-lg"
            fill="currentColor"
          />
        </div>

        <span className="absolute bottom-2 right-2 rounded bg-void px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {formatDuration(video.duration_seconds)}
        </span>

        {video.is_short && (
           <span className="absolute left-2 top-2 rounded-full bg-violet px-2 py-0.5 text-[11px] font-medium text-void">
            Shorts
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">{video.title}</h3>
        <div className="mt-2.5 flex items-center gap-3.5 font-mono text-xs text-ink">
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

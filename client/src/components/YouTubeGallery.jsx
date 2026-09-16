import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import { getLatestVideos, ApiError } from "../services/api.js";
import VideoCard from "./VideoCard.jsx";
import VideoCardSkeleton from "./VideoCardSkeleton.jsx";
import { cn } from "../lib/utils.js";

const TABS = [
  { key: "all", label: "Все" },
  { key: "videos", label: "Видео" },
  { key: "shorts", label: "Shorts" },
];

export default function YouTubeGallery() {
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let cancelled = false;

    getLatestVideos(12)
      .then((data) => {
        if (cancelled) return;
        setVideos(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : "Не удалось получить видео. Проверьте соединение и попробуйте снова."
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    if (activeTab === "videos") return videos.filter((v) => !v.is_short);
    if (activeTab === "shorts") return videos.filter((v) => v.is_short);
    return videos;
  }, [videos, activeTab]);

  return (
    <section id="videos" aria-labelledby="videos-title" className="container-app py-16 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">Сигнал канала</p>
          <h2 id="videos-title" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Последние ролики
          </h2>
          <p className="mt-2 max-w-md text-sm text-mute">
            Свежие видео и Shorts прямо с канала — без захода на YouTube.
          </p>
        </div>

        <div role="tablist" aria-label="Тип контента" className="flex gap-1 rounded-lg border border-line bg-panel/60 p-1 self-start">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="video-results"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm transition-colors",
                activeTab === tab.key
                  ? "bg-emerald text-void font-medium"
                  : "text-mute hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {status === "loading" && (
           <div id="video-results" role="tabpanel" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-violet" strokeWidth={1.6} />
            <p className="text-sm text-mute">{errorMessage}</p>
          </div>
        )}

        {status === "ready" && filteredVideos.length === 0 && (
          <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
            <Radio className="h-8 w-8 text-mute" strokeWidth={1.6} />
            <p className="text-sm text-mute">
              В этой категории пока нет роликов — загляните позже.
            </p>
          </div>
        )}

        {status === "ready" && filteredVideos.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVideos.map((video) => (
              <VideoCard key={video.video_id} video={video} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

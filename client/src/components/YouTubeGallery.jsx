import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Radio, Search } from "lucide-react";
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    getLatestVideos(6)
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
            : "Не удалось получить видео. Проверьте соединение и попробуйте снова.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const byTab =
      activeTab === "videos"
        ? videos.filter((v) => !v.is_short)
        : activeTab === "shorts"
          ? videos.filter((v) => v.is_short)
          : videos;
    return query
      ? byTab.filter((video) =>
          `${video.title} ${video.description}`.toLocaleLowerCase().includes(query),
        )
      : byTab;
  }, [videos, activeTab, search]);

  return (
    <section id="videos" aria-labelledby="videos-title" className="container-app py-16 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
            Сигнал канала
          </p>
          <h2
            id="videos-title"
            className="font-display text-2xl font-semibold text-ink sm:text-3xl"
          >
            Последние ролики
          </h2>
          <p className="mt-2 max-w-md text-sm text-mute">
            Свежие видео и Shorts прямо с канала — без захода на YouTube.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Тип контента"
          className="flex gap-1 rounded-lg border border-line bg-panel/60 p-1 self-start"
        >
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
                  : "text-mute hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <label className="relative mt-6 block max-w-md">
        <span className="sr-only">Поиск по видео</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Найти ролик…"
          className="w-full rounded-lg border border-line bg-panel/60 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-mute/70 focus:border-emerald/50 focus:outline-none focus:ring-1 focus:ring-emerald/30"
        />
      </label>

      <div className="mt-8">
        {status === "loading" && (
          <div
            id="video-results"
            role="tabpanel"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-violet" strokeWidth={1.6} />
            <p className="text-sm text-mute">{errorMessage}</p>
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:border-emerald/50">Повторить</button>
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

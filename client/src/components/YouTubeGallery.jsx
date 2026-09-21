import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Radio, Search } from "lucide-react";
import { getLatestVideos, ApiError, LATEST_VIDEOS_QUERY_KEY } from "../services/api.js";
import Button from "./Button.jsx";
import VideoCard from "./VideoCard.jsx";
import VideoCardSkeleton from "./VideoCardSkeleton.jsx";
import { cn } from "../lib/utils.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import { useSearchParams } from "react-router-dom";

const TABS = [
  { key: "all", label: "Все" },
  { key: "videos", label: "Видео" },
  { key: "shorts", label: "Shorts" },
];
const TAB_KEYS = new Set(TABS.map((tab) => tab.key));
const SORT_KEYS = new Set(["newest", "title"]);

export default function YouTubeGallery() {
  const [params, setParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => params.get("video_type") || "all");
  const [search, setSearch] = useState(() => params.get("video_q") || "");
  const [sort, setSort] = useState(() => params.get("video_sort") || "newest");
  const [page, setPage] = useState(() => Number(params.get("video_page")) || 1);
  const debouncedSearch = useDebouncedValue(search);
  const pageSize = 8;
  const {
    data: videos = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: LATEST_VIDEOS_QUERY_KEY,
    queryFn: () => getLatestVideos(12),
  });
  const status = isPending ? "loading" : isError ? "error" : "ready";
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : "Не удалось получить видео. Проверьте соединение и попробуйте снова.";

  const filteredVideos = useMemo(() => {
    const query = debouncedSearch.trim().toLocaleLowerCase();
    const byTab =
      activeTab === "videos"
        ? videos.filter((v) => !v.is_short)
        : activeTab === "shorts"
          ? videos.filter((v) => v.is_short)
          : videos;
    const searched = query
      ? byTab.filter((video) =>
          `${video.title} ${video.description}`.toLocaleLowerCase().includes(query),
        )
      : byTab;
    return [...searched].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "ru")
        : new Date(b.published_at) - new Date(a.published_at),
    );
  }, [videos, activeTab, debouncedSearch, sort]);

  useEffect(() => setPage(1), [activeTab, debouncedSearch, sort]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    [
      ["video_type", activeTab, "all"],
      ["video_q", search.trim(), ""],
      ["video_sort", sort, "newest"],
      ["video_page", page, 1],
    ].forEach(([key, value, defaultValue]) => {
      if (String(value) === String(defaultValue) || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [activeTab, search, sort, page, params, setParams]);

  const visibleVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.ceil(filteredVideos.length / pageSize);

  // Состояние страницы должно следовать URL при back/forward и не показывать
  // пустой экран, если после фильтрации текущая страница исчезла.
  useEffect(() => {
    const urlTab = params.get("video_type") || "all";
    const urlSort = params.get("video_sort") || "newest";
    const urlPage = Number(params.get("video_page"));
    const nextTab = TAB_KEYS.has(urlTab) ? urlTab : "all";
    const nextSort = SORT_KEYS.has(urlSort) ? urlSort : "newest";
    const nextSearch = params.get("video_q") || "";
    const nextPage = Number.isInteger(urlPage) && urlPage > 0 ? urlPage : 1;
    setActiveTab((value) => (value === nextTab ? value : nextTab));
    setSort((value) => (value === nextSort ? value : nextSort));
    setSearch((value) => (value === nextSearch ? value : nextSearch));
    setPage((value) => (value === nextPage ? value : nextPage));
  }, [params]);
  useEffect(() => {
    if (pages > 0 && page > pages) setPage(pages);
  }, [page, pages]);

  return (
    <section id="videos" aria-labelledby="videos-title" className="container-app py-16 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
            Из канала
          </p>
          <h2
            id="videos-title"
            className="font-display text-2xl font-semibold text-ink sm:text-3xl"
          >
            Последние ролики
          </h2>
          <p className="mt-2 max-w-md text-sm text-mute">
            Реальные видео и Shorts из YouTube API. Ищите по названию или отфильтруйте формат.
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
                "interactive-control rounded-md px-3.5 py-1.5 text-sm transition-colors",
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

      <label className="mt-3 block max-w-xs">
        <span className="sr-only">Сортировка видео</span>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="field-control w-full"
        >
          <option value="newest">Сначала новые</option>
          <option value="title">По названию</option>
        </select>
      </label>

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
          className="field-control w-full pl-9 pr-3"
        />
      </label>

      <div className="mt-8">
        {status === "loading" && (
          <div
            id="video-results"
            role="tabpanel"
            aria-live="polite"
            aria-busy="true"
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
            <p role="alert" className="text-sm text-mute">
              {errorMessage}
            </p>
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              Повторить
            </Button>
          </div>
        )}

        {status === "ready" && filteredVideos.length === 0 && (
          <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
            <Radio className="h-8 w-8 text-mute" strokeWidth={1.6} />
            <p className="text-sm text-mute">
              {search.trim()
                ? "Ничего не найдено. Попробуйте изменить запрос."
                : "В этой категории пока нет роликов — загляните позже."}
            </p>
          </div>
        )}

        {status === "ready" && filteredVideos.length > 0 && (
          <div
            id="video-results"
            role="tabpanel"
            aria-live="polite"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {visibleVideos.map((video) => (
              <VideoCard key={video.video_id} video={video} />
            ))}
          </div>
        )}
        {status === "ready" && pages > 1 && (
          <nav aria-label="Пагинация видео" className="mt-7 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="interactive-control rounded-lg border border-line px-3 py-1.5 text-xs text-ink"
            >
              Назад
            </button>
            <span className="px-2 font-mono text-xs text-mute">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page === pages}
              onClick={() => setPage((value) => value + 1)}
              className="interactive-control rounded-lg border border-line px-3 py-1.5 text-xs text-ink"
            >
              Далее
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}

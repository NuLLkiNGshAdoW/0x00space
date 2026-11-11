import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { getLatestVideos } from "../services/api.js";

export default function RelatedVideoPicker({ value = [], onChange }) {
  const [search, setSearch] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const { data: videos = [], isPending, isError } = useQuery({
    queryKey: ["admin-related-video-picker"],
    queryFn: () => getLatestVideos(50),
    staleTime: 5 * 60 * 1000,
  });
  const selectedIds = [...new Set(value.map(String).filter(Boolean))];
  const selectedVideos = selectedIds.map((id) => videos.find((video) => video.video_id === id) || { video_id: id, title: "Видео недоступно в списке последних 50" });
  const filteredVideos = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("ru-RU");
    return videos.filter((video) => !needle || video.title.toLocaleLowerCase("ru-RU").includes(needle));
  }, [search, videos]);

  const toggle = (videoId) => {
    setLimitMessage("");
    if (selectedIds.includes(videoId)) {
      onChange(selectedIds.filter((id) => id !== videoId));
    } else if (selectedIds.length >= 20) {
      setLimitMessage("Можно связать не более 20 видео.");
    } else {
      onChange([...selectedIds, videoId]);
    }
  };

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm text-ink">Связанные видео · {selectedIds.length}/20</legend>
      <label className="relative block">
        <span className="sr-only">Поиск видео для привязки</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Найти ролик по названию…"
          className="field-control w-full pl-9"
        />
      </label>

      {selectedVideos.length > 0 && <ul className="grid gap-1" aria-label="Выбранные видео">
        {selectedVideos.map((video) => <li key={video.video_id} className="flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft/40 p-2 text-xs text-ink">
          {video.thumbnail_url && <img src={video.thumbnail_url} alt="" className="h-9 w-16 rounded object-cover" />}
          <span className="min-w-0 flex-1 truncate">{video.title}</span>
          <button type="button" onClick={() => toggle(video.video_id)} aria-label={`Убрать видео ${video.title}`} className="rounded px-2 py-1 text-mute hover:text-amber">Убрать</button>
        </li>)}
      </ul>}

      <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-void/35 p-1" aria-label="Результаты видео">
        {isPending && <p className="p-3 text-xs text-mute">Загружаем видео канала…</p>}
        {isError && <p role="status" className="p-3 text-xs text-mute">Не удалось загрузить список видео. Попробуйте позже.</p>}
        {!isPending && !isError && filteredVideos.length === 0 && <p className="p-3 text-xs text-mute">Видео по этому запросу не найдены.</p>}
        {filteredVideos.map((video) => {
          const selected = selectedIds.includes(video.video_id);
          return <button
            key={video.video_id}
            type="button"
            aria-pressed={selected}
            aria-label={`${selected ? "Убрать" : "Связать"} видео ${video.title}`}
            onClick={() => toggle(video.video_id)}
            className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors ${selected ? "bg-emerald-soft text-emerald" : "text-ink hover:bg-panel2"}`}
          >
            <img src={video.thumbnail_url} alt="" loading="lazy" className="h-10 w-[4.5rem] shrink-0 rounded object-cover" />
            <span className="min-w-0 flex-1 text-xs leading-relaxed">{video.title}</span>
            {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
          </button>;
        })}
      </div>
      {limitMessage && <p role="status" className="text-xs text-amber">{limitMessage}</p>}
      <p className="text-[11px] leading-relaxed text-mute">Показаны последние 50 видео канала. Сохранённые вручную ID вне списка можно убрать, нажав «Убрать».</p>
    </fieldset>
  );
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, Play, Search, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import Seo from "../components/Seo.jsx";
import ApiState from "../components/ApiState.jsx";
import { getEvents, getLatestVideos, getResources, getSeeds } from "../services/api.js";

const SEARCH_LIMIT = 50;
const CONTENT_FILTERS = ["Все", "Видео", "Материал", "Сид", "Ивент"];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const activeFilter = CONTENT_FILTERS.includes(params.get("type")) ? params.get("type") : "Все";
  const [value, setValue] = useState(query);
  useEffect(() => setValue(query), [query]);
  const results = useQuery({
    queryKey: ["site-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const [videos, resources, seedsPage, eventsPage] = await Promise.all([
        getLatestVideos(SEARCH_LIMIT),
        getResources(undefined, undefined, { search: query, page: 1, limit: SEARCH_LIMIT }),
        getSeeds({ search: query, page: 1, limit: SEARCH_LIMIT }),
        getEvents({ page: 1, limit: SEARCH_LIMIT }),
      ]);
      const needle = query.toLocaleLowerCase("ru-RU");
      const events = (eventsPage?.items || []).filter((event) =>
        `${event.title} ${event.description} ${event.game}`.toLocaleLowerCase("ru-RU").includes(needle),
      );
      return [
        ...(Array.isArray(videos) ? videos : []).filter((item) =>
          `${item.title} ${item.description || ""}`.toLocaleLowerCase("ru-RU").includes(needle),
        ).map((item) => ({ type: "Видео", title: item.title, description: item.description, href: `/videos/${item.video_id}`, icon: Play })),
        ...(resources?.items || []).map((item) => ({ type: "Материал", title: item.title, description: item.description, href: "/materials", icon: FileText })),
        ...(seedsPage?.items || []).map((item) => ({ type: "Сид", title: item.title, description: item.description, href: "/materials?resource_view=seeds", icon: Sparkles })),
        ...events.map((item) => ({ type: "Ивент", title: item.title, description: item.description, href: "/events", icon: CalendarDays })),
      ];
    },
    staleTime: 60_000,
  });

  function submit(event) {
    event.preventDefault();
    const next = value.trim();
    setParams(next ? { q: next } : {});
  }

  function selectFilter(filter) {
    const next = new URLSearchParams(params);
    if (filter === "Все") next.delete("type");
    else next.set("type", filter);
    setParams(next);
  }

  const filteredResults = activeFilter === "Все"
    ? results.data || []
    : (results.data || []).filter((item) => item.type === activeFilter);

  return (
    <div className="min-h-screen">
      <Seo title="Поиск по сайту — 0x00 SPACE" description="Найдите видео, игровые материалы, сиды и события 0x00 SPACE." path="/search" noindex />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-10 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow">Медиатека сообщества</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">Поиск по сайту</h1>
          <p className="mt-3 text-sm text-mute sm:text-base">Ищите видео, материалы, сиды и игровые ивенты.</p>
          <form onSubmit={submit} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Поисковый запрос</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" aria-hidden="true" />
              <input value={value} onChange={(event) => setValue(event.target.value)} autoFocus placeholder="Например, Minecraft или хоррор" className="field-control w-full pl-12" />
            </label>
            <button className="button-primary sm:min-w-32" type="submit">Найти</button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Фильтр типа контента">
            {CONTENT_FILTERS.map((filter) => <button
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => selectFilter(filter)}
              className={`chip ${activeFilter === filter ? "chip-active" : ""}`}
            >{filter === "Все" ? filter : `${filter}${filter === "Материал" ? "ы" : filter === "Ивент" ? "ы" : ""}`}</button>)}
          </div>

          <section aria-live="polite" className="mt-9">
            {query.length < 2 ? <p className="rounded-2xl border border-line bg-panel/40 p-6 text-sm text-mute">Введите минимум два символа для поиска.</p> : null}
            {results.isPending && query.length >= 2 && <ApiState status="loading" />}
            {results.isError && <ApiState status="error" error={results.error} onRetry={results.refetch} />}
            {results.isSuccess && <>
              <p className="mb-4 text-sm text-mute">{filteredResults.length ? `Найдено: ${filteredResults.length}` : results.data.length ? "В этой категории совпадений нет" : `По запросу «${query}» ничего не найдено`}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredResults.map((item, index) => {
                  const Icon = item.icon;
                  return <Link key={`${item.type}-${item.title}-${index}`} to={item.href} className="glass glass-hover rounded-2xl p-5">
                    <span className="inline-flex items-center gap-2 text-xs text-emerald"><Icon className="h-4 w-4" />{item.type}</span>
                    <h2 className="mt-3 font-semibold text-ink">{item.title}</h2>
                    {item.description && <p className="mt-2 line-clamp-2 text-sm text-mute">{item.description}</p>}
                  </Link>;
                })}
              </div>
            </>}
          </section>
        </div>
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

import { useEffect, useState } from "react";
import { PackageOpen, AlertTriangle, Search } from "lucide-react";
import { getResources, getSeeds, ApiError } from "../services/api.js";
import ResourceCard from "./ResourceCard.jsx";
import SeedCard from "./SeedCard.jsx";
import { cn } from "../lib/utils.js";

const GAME_FILTERS = [
  { key: "", label: "Все" },
  { key: "minecraft", label: "Minecraft" },
  { key: "coop", label: "Кооператив" },
  { key: "horror", label: "Хорроры" },
  { key: "other", label: "Другое" },
];

const VIEWS = [
  { key: "resources", label: "Материалы" },
  { key: "seeds", label: "Сиды миров" },
];

export default function ResourcesAndGuides() {
  const [activeView, setActiveView] = useState("resources");
  const [gameFilter, setGameFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [resources, setResources] = useState([]);
  const [resourcesStatus, setResourcesStatus] = useState("loading");
  const [resourcesError, setResourcesError] = useState("");

  const [seeds, setSeeds] = useState([]);
  const [seedsStatus, setSeedsStatus] = useState("idle"); // idle | loading | ready | error
  const [seedsError, setSeedsError] = useState("");

  // Материалы перезагружаем при смене фильтра по игре
  useEffect(() => {
    let cancelled = false;
    setResourcesStatus("loading");

    getResources(undefined, gameFilter || undefined)
      .then((data) => {
        if (cancelled) return;
        setResources(data);
        setResourcesStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setResourcesError(
          err instanceof ApiError ? err.message : "Не удалось загрузить материалы."
        );
        setResourcesStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [gameFilter]);

  useEffect(() => setPage(1), [gameFilter, search, activeView]);

  const filterItems = (items) => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.description, item.game_version, item.minecraft_version]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    );
  };

  const filteredResources = filterItems(resources);
  const filteredSeeds = filterItems(seeds);
  const visibleResources = filteredResources.slice((page - 1) * pageSize, page * pageSize);
  const visibleSeeds = filteredSeeds.slice((page - 1) * pageSize, page * pageSize);

  // Сиды подгружаем лениво — только когда пользователь открыл вкладку впервые
  useEffect(() => {
    if (activeView !== "seeds" || seedsStatus !== "idle") return;

    setSeedsStatus("loading");
    getSeeds()
      .then((data) => {
        setSeeds(data);
        setSeedsStatus("ready");
      })
      .catch((err) => {
        setSeedsError(err instanceof ApiError ? err.message : "Не удалось загрузить сиды.");
        setSeedsStatus("error");
      });
  }, [activeView, seedsStatus]);

  return (
    <section id="resources" className="border-t border-line bg-panel/20 py-16 sm:py-20">
      <div className="container-app">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet">Арсенал игрока</p>
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Материалы и сиды
            </h2>
            <p className="mt-2 max-w-md text-sm text-mute">
              Текстуры, шейдеры, моды, гайды по хоррорам и интересные миры —
              всё, что упоминается в роликах.
            </p>
          </div>

            <div className="flex gap-1 rounded-lg border border-line bg-panel/60 p-1 self-start">
            {VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setActiveView(view.key)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm transition-colors",
                  activeView === view.key
                    ? "bg-violet text-white font-medium"
                    : "text-mute hover:text-ink"
                )}
              >
                {view.label}
              </button>
            ))}
            </div>
          </div>

          <label className="relative mt-6 block max-w-md">
            <span className="sr-only">Поиск по материалам</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по материалам и сидам…" className="w-full rounded-lg border border-line bg-void/40 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-mute/70 focus:border-emerald/50 focus:outline-none focus:ring-1 focus:ring-emerald/30" />
          </label>

        {activeView === "resources" && (
          <>
            <div className="mt-7 flex flex-wrap gap-2">
              {GAME_FILTERS.map((filter) => (
                <button
                  key={filter.key || "all"}
                  type="button"
                  onClick={() => setGameFilter(filter.key)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                    gameFilter === filter.key
                      ? "border-emerald/60 bg-emerald-soft text-emerald"
                      : "border-line text-mute hover:border-emerald/30 hover:text-ink"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {resourcesStatus === "loading" && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass aspect-[4/5] animate-pulse rounded-xl" />
                  ))}
                </div>
              )}

              {resourcesStatus === "error" && (
                <EmptyState icon={AlertTriangle} text={resourcesError} tone="warning" />
              )}

              {resourcesStatus === "ready" && filteredResources.length === 0 && (
                <EmptyState
                  icon={PackageOpen}
                  text="В этой категории пока нет материалов — загляните позже."
                />
              )}

              {resourcesStatus === "ready" && filteredResources.length > 0 && (
                <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
                <Pagination page={page} total={filteredResources.length} pageSize={pageSize} setPage={setPage} />
                </>
              )}
            </div>
          </>
        )}

        {activeView === "seeds" && (
          <div className="mt-7">
            {seedsStatus === "loading" && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass aspect-[4/5] animate-pulse rounded-xl" />
                ))}
              </div>
            )}

            {seedsStatus === "error" && (
              <EmptyState icon={AlertTriangle} text={seedsError} tone="warning" />
            )}

            {seedsStatus === "ready" && filteredSeeds.length === 0 && (
              <EmptyState icon={PackageOpen} text="Сидов пока нет — они появятся после следующего ролика." />
            )}

            {seedsStatus === "ready" && filteredSeeds.length > 0 && (
              <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleSeeds.map((seed) => (
                  <SeedCard key={seed.id} seed={seed} />
                ))}
              </div>
              <Pagination page={page} total={filteredSeeds.length} pageSize={pageSize} setPage={setPage} />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Pagination({ page, total, pageSize, setPage }) {
  const pages = Math.ceil(total / pageSize);
  if (pages < 2) return null;
  return (
    <nav aria-label="Пагинация" className="mt-7 flex items-center justify-center gap-2">
      <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-mute disabled:opacity-40">Назад</button>
      <span className="px-2 font-mono text-xs text-mute">{page} / {pages}</span>
      <button type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-mute disabled:opacity-40">Далее</button>
    </nav>
  );
}

function EmptyState({ icon: Icon, text, tone = "neutral" }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
      <Icon className={cn("h-8 w-8", tone === "warning" ? "text-violet" : "text-mute")} strokeWidth={1.6} />
      <p className="text-sm text-mute">{text}</p>
    </div>
  );
}

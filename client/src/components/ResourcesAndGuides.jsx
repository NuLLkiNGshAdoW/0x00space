import { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PackageOpen, AlertTriangle, Search } from "lucide-react";
import { getResources, getSeeds, ApiError } from "../services/api.js";
import ResourceCard from "./ResourceCard.jsx";
import SeedCard from "./SeedCard.jsx";
import { cn } from "../lib/utils.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import { useSearchParams } from "react-router-dom";

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
const VIEW_KEYS = new Set(VIEWS.map((view) => view.key));
const SORT_KEYS = new Set(["newest", "title"]);

export default function ResourcesAndGuides() {
  const [params, setParams] = useSearchParams();
  const activeView = VIEW_KEYS.has(params.get("resource_view"))
    ? params.get("resource_view")
    : "resources";
  const gameFilter = params.get("resource_game") || "";
  const [search, setSearch] = useState(() => params.get("resource_q") || "");
  const page = Math.max(1, Number.parseInt(params.get("resource_page"), 10) || 1);
  const sort = SORT_KEYS.has(params.get("resource_sort")) ? params.get("resource_sort") : "newest";
  const debouncedSearch = useDebouncedValue(search);
  const pageSize = 8;
  const patchParams = useCallback(
    (changes) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === "" || value == null) next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const resourcesQuery = useQuery({
    queryKey: ["resources", gameFilter, debouncedSearch, sort, page, pageSize],
    queryFn: () =>
      getResources(undefined, gameFilter || undefined, {
        search: debouncedSearch.trim() || undefined,
        sort,
        page,
        limit: pageSize,
      }),
    enabled: activeView === "resources",
    placeholderData: keepPreviousData,
  });
  const seedsQuery = useQuery({
    queryKey: ["seeds", debouncedSearch, sort, page, pageSize],
    queryFn: () =>
      getSeeds({
        search: debouncedSearch.trim() || undefined,
        sort,
        page,
        limit: pageSize,
      }),
    enabled: activeView === "seeds",
    placeholderData: keepPreviousData,
  });
  const resourcesPage = resourcesQuery.data || { items: [], has_next: false };
  const seedsPage = seedsQuery.data || { items: [], has_next: false };
  const resources = resourcesPage.items || [];
  const seeds = seedsPage.items || [];
  const resourcesStatus = resourcesQuery.isPending
    ? "loading"
    : resourcesQuery.isError
      ? "error"
      : "ready";
  const seedsStatus = seedsQuery.isPending ? "loading" : seedsQuery.isError ? "error" : "ready";
  const resourcesError =
    resourcesQuery.error instanceof ApiError
      ? resourcesQuery.error.message
      : "Не удалось загрузить материалы.";
  const seedsError =
    seedsQuery.error instanceof ApiError ? seedsQuery.error.message : "Не удалось загрузить сиды.";

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (query !== (params.get("resource_q") || "")) {
      patchParams({ resource_q: query, resource_page: "" });
    }
  }, [debouncedSearch, params, patchParams]);

  return (
    <section id="resources" className="border-y border-line/70 bg-panel/20 py-16 sm:py-20">
      <div className="container-app">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet">
              Арсенал игрока
            </p>
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Материалы и сиды
            </h2>
            <p className="mt-2 max-w-md text-sm text-mute">
              Текстуры, шейдеры, моды, гайды по хоррорам и интересные миры — всё, что упоминается в
              роликах.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Раздел материалов"
            className="flex gap-1 rounded-lg border border-line bg-panel/60 p-1 self-start"
          >
            {VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                id={`${view.key}-tab`}
                role="tab"
                aria-selected={activeView === view.key}
                aria-controls={`${view.key}-panel`}
                onClick={() =>
                  patchParams({
                    resource_view: view.key === "resources" ? "" : view.key,
                    resource_page: "",
                  })
                }
                className={cn(
                  "interactive-control rounded-md px-3.5 py-1.5 text-sm transition-colors",
                  activeView === view.key
                    ? "bg-violet text-void font-medium"
                    : "text-mute hover:text-ink",
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        <label className="relative mt-6 block max-w-md">
          <span className="sr-only">Поиск по материалам</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по материалам и сидам…"
            className="field-control w-full pl-9 pr-3"
          />
        </label>

        <label className="mt-3 block max-w-xs">
          <span className="sr-only">Сортировка материалов</span>
          <select
            value={sort}
            onChange={(event) =>
              patchParams({
                resource_sort: event.target.value === "newest" ? "" : event.target.value,
                resource_page: "",
              })
            }
            className="field-control w-full"
          >
            <option value="newest">Сначала новые</option>
            <option value="title">По названию</option>
          </select>
        </label>

        {activeView === "resources" && (
          <>
            <div className="mt-7 flex flex-wrap gap-2">
              {GAME_FILTERS.map((filter) => (
                <button
                  key={filter.key || "all"}
                  type="button"
                  onClick={() => patchParams({ resource_game: filter.key, resource_page: "" })}
                  className={cn(
                    "interactive-control rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                    gameFilter === filter.key
                      ? "border-emerald/60 bg-emerald-soft text-emerald"
                      : "border-line text-mute hover:border-emerald/30 hover:text-ink",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div
              id="resources-panel"
              role="tabpanel"
              aria-labelledby="resources-tab"
              className="mt-6"
            >
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

              {resourcesStatus === "ready" && resources.length === 0 && (
                <>
                  <EmptyState
                    icon={PackageOpen}
                    text="В этой категории пока нет материалов — загляните позже."
                  />
                  {page > 1 && (
                    <Pagination
                      page={page}
                      hasNext={false}
                      setPage={(nextPage) => patchParams({ resource_page: nextPage })}
                    />
                  )}
                </>
              )}

              {resourcesStatus === "ready" && resources.length > 0 && (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {resources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                  <Pagination
                    page={page}
                    hasNext={resourcesPage.has_next}
                    setPage={(nextPage) => patchParams({ resource_page: nextPage })}
                  />
                </>
              )}
            </div>
          </>
        )}

        {activeView === "seeds" && (
          <div id="seeds-panel" role="tabpanel" aria-labelledby="seeds-tab" className="mt-7">
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

            {seedsStatus === "ready" && seeds.length === 0 && (
              <>
                <EmptyState
                  icon={PackageOpen}
                  text="Сидов пока нет — они появятся после следующего ролика."
                />
                {page > 1 && (
                  <Pagination
                    page={page}
                    hasNext={false}
                    setPage={(nextPage) => patchParams({ resource_page: nextPage })}
                  />
                )}
              </>
            )}

            {seedsStatus === "ready" && seeds.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {seeds.map((seed) => (
                    <SeedCard key={seed.id} seed={seed} />
                  ))}
                </div>
                <Pagination
                  page={page}
                  hasNext={seedsPage.has_next}
                  setPage={(nextPage) => patchParams({ resource_page: nextPage })}
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Pagination({ page, hasNext, setPage }) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav aria-label="Пагинация" className="mt-7 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        className="interactive-control rounded-lg border border-line px-3 py-1.5 text-xs text-mute disabled:cursor-not-allowed disabled:bg-panel2 disabled:text-mute"
      >
        Назад
      </button>
      <span className="px-2 font-mono text-xs text-mute">Страница {page}</span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => setPage(page + 1)}
        className="interactive-control rounded-lg border border-line px-3 py-1.5 text-xs text-mute disabled:cursor-not-allowed disabled:bg-panel2 disabled:text-mute"
      >
        Далее
      </button>
    </nav>
  );
}

function EmptyState({ icon: Icon, text, tone = "neutral" }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
      <Icon
        className={cn("h-8 w-8", tone === "warning" ? "text-violet" : "text-mute")}
        strokeWidth={1.6}
      />
      <p className="text-sm text-mute">{text}</p>
    </div>
  );
}

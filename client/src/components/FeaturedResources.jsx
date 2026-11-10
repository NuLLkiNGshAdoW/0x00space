import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, PackageOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { getResources } from "../services/api.js";
import ResourceCard from "./ResourceCard.jsx";

const CATEGORIES = ["Текстур-паки", "Шейдеры", "Моды", "Сборки", "Гайды"];

export default function FeaturedResources() {
  const { data, isPending } = useQuery({
    queryKey: ["resources", "home-preview"],
    queryFn: () => getResources(undefined, undefined, { sort: "newest", page: 1, limit: 4 }),
    select: (result) => (Array.isArray(result) ? result : result?.items || []).slice(0, 4),
  });
  const resources = data || [];

  return (
    <section
      aria-labelledby="featured-resources-title"
      className="border-y border-line/70 bg-panel/20 py-16 sm:py-20"
    >
      <div className="container-app">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Арсенал игрока</p>
            <h2
              id="featured-resources-title"
              className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              Материалы из роликов
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
              Текстуры, шейдеры, моды и гайды, которые мы упоминаем в видео. Всё собрано в одном
              месте, с фильтрами по игре.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((category) => (
              <span key={category} className="chip cursor-default">
                {category}
              </span>
            ))}
            <Link to="/materials" className="button-secondary">
              Все материалы
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {isPending && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="glass aspect-[4/5] animate-pulse rounded-2xl" />
              ))}
            </div>
          )}

          {!isPending && resources.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}

          {!isPending && resources.length === 0 && (
            <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-14 text-center">
              <PackageOpen className="h-8 w-8 text-mute" strokeWidth={1.6} />
              <p className="text-sm text-mute">
                Материалы появятся после следующего ролика. А пока загляните в раздел целиком.
              </p>
              <Link to="/materials" className="button-secondary mt-2">
                Открыть материалы
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { Blocks, BookOpen, Download, LayoutGrid, Package, PackageOpen, Sparkles } from "lucide-react";
import { trackEvent } from "../lib/analytics.js";
import FavoriteButton from "./FavoriteButton.jsx";

const TYPE_META = {
  texture_pack: { label: "Текстур-пак", icon: LayoutGrid },
  shader: { label: "Шейдер", icon: Sparkles },
  mod: { label: "Мод", icon: Blocks },
  modpack: { label: "Сборка", icon: Package },
  guide: { label: "Гайд", icon: BookOpen },
  other: { label: "Материал", icon: PackageOpen },
};

const GAME_LABELS = {
  minecraft: "Minecraft",
  coop: "Кооп",
  horror: "Хоррор",
  other: "Другое",
};

export default function ResourceCard({ resource }) {
  const meta = TYPE_META[resource.resource_type] ?? TYPE_META.other;
  const Icon = meta.icon;
  const gameLabel = GAME_LABELS[resource.game_category] || resource.game_category;

  return (
    <article className="glass glass-hover flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line/70 bg-panel2">
        {resource.cover_image_url ? (
          <img
            src={resource.cover_image_url}
            alt={`Обложка материала: ${resource.title}`}
            width="480"
            height="300"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="media-fallback relative flex h-full w-full items-center justify-center overflow-hidden">
            <Icon className="relative z-10 h-10 w-10 text-emerald/70" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-void/80 to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-void/80 px-2.5 py-1 text-[11px] font-medium text-emerald backdrop-blur-sm">
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-void/70 p-0.5 backdrop-blur-sm">
          <FavoriteButton id={`resource-${resource.id}`} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute">
          {gameLabel && <span>{gameLabel}</span>}
          {resource.game_version && (
            <>
              <span className="h-1 w-1 rounded-full bg-line" />
              <span className="font-mono">{resource.game_version}</span>
            </>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
          {resource.title}
        </h3>

        {resource.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-mute">
            {resource.description}
          </p>
        )}

        <div className="mt-auto pt-4">
          <a
            href={resource.download_url}
            onClick={() => trackEvent("resource_download", { resource_title: resource.title })}
            target="_blank"
            rel="noreferrer"
            className="button-secondary w-full"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Скачать
          </a>
        </div>
      </div>
    </article>
  );
}

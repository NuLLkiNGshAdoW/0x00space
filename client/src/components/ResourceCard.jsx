import {
  Blocks,
  BookOpen,
  Download,
  LayoutGrid,
  Package,
  PackageOpen,
  Sparkles,
} from "lucide-react";
import { trackEvent } from "../lib/analytics.js";
import FavoriteButton from "./FavoriteButton.jsx";
import { Link } from "react-router-dom";

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

export default function ResourceCard({ resource, preview = false, excludeVideoId }) {
  const meta = TYPE_META[resource.resource_type] ?? TYPE_META.other;
  const Icon = meta.icon;
  const gameLabel = GAME_LABELS[resource.game_category] || resource.game_category;
  const downloadUrl = getSafeDownloadUrl(resource.download_url);
  const relatedVideoIds = (resource.related_video_ids || []).filter((id) => id !== excludeVideoId);

  return (
    <article className="resource-card glass glass-hover flex h-full flex-col overflow-hidden rounded-2xl">
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
          {!preview && <span className="absolute right-2 top-2 rounded-full bg-void/70 p-0.5 backdrop-blur-sm">
            <FavoriteButton id={`resource-${resource.id}`} />
          </span>}
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
          {preview ? (
            <span className="button-secondary w-full" aria-disabled="true">
              <Download className="h-4 w-4" strokeWidth={1.8} />
              {downloadUrl ? "Скачать" : "Ссылка не указана"}
            </span>
          ) : downloadUrl ? (
            <a
              href={downloadUrl}
              onClick={() => trackEvent("resource_download", { resource_title: resource.title })}
              target="_blank"
              rel="noopener noreferrer"
              className="button-secondary w-full"
            >
              <Download className="h-4 w-4" strokeWidth={1.8} />
              Скачать
            </a>
          ) : (
            <span
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm text-mute"
              role="status"
            >
              Ссылка временно недоступна
            </span>
          )}
          {relatedVideoIds.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-[11px] text-mute">Видео с этим материалом</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedVideoIds.slice(0, 3).map((videoId, index) => preview ? (
                  <span key={videoId} className="text-xs text-emerald">Смотреть видео {index + 1}</span>
                ) : (
                  <Link key={videoId} to={`/videos/${videoId}`} className="text-xs text-emerald hover:underline">
                    Смотреть видео {index + 1}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function getSafeDownloadUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

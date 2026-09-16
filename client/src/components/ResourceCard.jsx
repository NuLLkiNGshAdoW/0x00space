import { Download } from "lucide-react";
import { trackEvent } from "../lib/analytics.js";
import FavoriteButton from "./FavoriteButton.jsx";

const TYPE_LABELS = {
  texture_pack: "Текстур-пак",
  shader: "Шейдер",
  mod: "Мод",
  modpack: "Сборка",
  guide: "Гайд",
  other: "Материал",
};

export default function ResourceCard({ resource }) {
  return (
    <div className="glass glass-hover flex flex-col overflow-hidden rounded-xl">
      {resource.cover_image_url && (
        <div className="aspect-video bg-panel2">
          <img
            src={resource.cover_image_url}
            alt={`Обложка материала: ${resource.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-soft px-2.5 py-0.5 text-xs text-emerald">
            {TYPE_LABELS[resource.resource_type] ?? resource.resource_type}
          </span>
          {resource.game_version && (
            <span className="font-mono text-xs text-mute">{resource.game_version}</span>
          )}
          <FavoriteButton id={`resource-${resource.id}`} />
        </div>

        <h3 className="mt-3 text-sm font-medium text-ink">{resource.title}</h3>

        {resource.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-mute">
            {resource.description}
          </p>
        )}

        <a
          href={resource.download_url}
          onClick={() => trackEvent("resource_download", { resource_title: resource.title })}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-line py-2 text-sm text-ink transition-colors hover:border-emerald/50 hover:text-emerald"
        >
          <Download className="h-4 w-4" strokeWidth={1.8} />
          Скачать
        </a>
      </div>
    </div>
  );
}

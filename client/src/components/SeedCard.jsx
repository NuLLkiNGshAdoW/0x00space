import { MapPin } from "lucide-react";
import CopyButton from "./CopyButton.jsx";
import FavoriteButton from "./FavoriteButton.jsx";

export default function SeedCard({ seed }) {
  return (
    <div className="glass glass-hover flex flex-col overflow-hidden rounded-xl">
      {seed.screenshot_url && (
        <div className="aspect-video bg-panel2">
          <img
            src={seed.screenshot_url}
            alt={`Скриншот сида: ${seed.title}`}
            width="480"
            height="270"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-ink">{seed.title}</h3>
          <span className="font-mono text-xs text-mute">{seed.minecraft_version}</span>
          <FavoriteButton id={`seed-${seed.id}`} />
        </div>

        {seed.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-mute">
            {seed.description}
          </p>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-void/40 px-3 py-2">
            <span className="font-mono text-xs text-ink">{seed.seed_code}</span>
            <CopyButton value={seed.seed_code} label="Сид" />
          </div>

          {seed.coordinates && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-void/40 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink">
                <MapPin className="h-3.5 w-3.5 text-violet" strokeWidth={1.8} />
                {seed.coordinates}
              </span>
              <CopyButton value={seed.coordinates} label="Коорд." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

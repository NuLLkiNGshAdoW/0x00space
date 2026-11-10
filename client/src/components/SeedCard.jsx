import { Hash, MapPin, Mountain } from "lucide-react";
import CopyButton from "./CopyButton.jsx";
import FavoriteButton from "./FavoriteButton.jsx";

export default function SeedCard({ seed }) {
  return (
    <article className="glass glass-hover flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line/70 bg-panel2">
        {seed.screenshot_url ? (
          <img
            src={seed.screenshot_url}
            alt={`Скриншот сида: ${seed.title}`}
            width="480"
            height="300"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="media-fallback relative flex h-full w-full items-center justify-center overflow-hidden">
            <Mountain className="relative z-10 h-10 w-10 text-violet/70" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-void/80 to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-void/80 px-2.5 py-1 text-[11px] font-medium text-violet backdrop-blur-sm">
          <MapPin className="h-3 w-3" />
          Сид мира
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-void/70 p-0.5 backdrop-blur-sm">
          <FavoriteButton id={`seed-${seed.id}`} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute">
          <span>Minecraft</span>
          {seed.minecraft_version && (
            <>
              <span className="h-1 w-1 rounded-full bg-line" />
              <span className="font-mono">{seed.minecraft_version}</span>
            </>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
          {seed.title}
        </h3>

        {seed.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-mute">{seed.description}</p>
        )}

        <div className="mt-auto space-y-2 pt-4">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-void/40 px-3 py-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-xs text-ink">
              <Hash className="h-3.5 w-3.5 shrink-0 text-emerald" strokeWidth={1.8} />
              <span className="truncate">{seed.seed_code}</span>
            </span>
            <CopyButton value={seed.seed_code} label="Сид" />
          </div>

          {seed.coordinates && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-void/40 px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-xs text-ink">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-violet" strokeWidth={1.8} />
                <span className="truncate">{seed.coordinates}</span>
              </span>
              <CopyButton value={seed.coordinates} label="Коорд." />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

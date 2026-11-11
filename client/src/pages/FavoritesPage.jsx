import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import Seo from "../components/Seo.jsx";
import ApiState from "../components/ApiState.jsx";
import ResourceCard from "../components/ResourceCard.jsx";
import SeedCard from "../components/SeedCard.jsx";
import VideoCard from "../components/VideoCard.jsx";
import { getResources, getSeeds, getVideo } from "../services/api.js";

const STORAGE_KEY = "0x00space_favorites";
const PAGE_SIZE = 50;

function readFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

async function getAllPages(fetchPage) {
  const items = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await fetchPage(page);
    items.push(...(result?.items || []));
    if (!result?.has_next) break;
  }
  return items;
}

export default function FavoritesPage() {
  const [favoriteIds, setFavoriteIds] = useState(readFavorites);
  useEffect(() => {
    const update = () => setFavoriteIds(readFavorites());
    window.addEventListener("favorites-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("favorites-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const query = useQuery({
    queryKey: ["favorites-content", favoriteIds],
    enabled: favoriteIds.length > 0,
    queryFn: async () => {
      const [videos, resources, seeds] = await Promise.all([
        Promise.allSettled(favoriteIds
          .filter((id) => id.startsWith("video-"))
          .map((id) => getVideo(id.slice("video-".length))))
          .then((results) => results.flatMap((result) => result.status === "fulfilled" ? [result.value.video] : [])),
        getAllPages((page) => getResources(undefined, undefined, { page, limit: PAGE_SIZE })),
        getAllPages((page) => getSeeds({ page, limit: PAGE_SIZE })),
      ]);
      const ids = new Set(favoriteIds);
      return {
        videos: videos.filter((item) => ids.has(`video-${item.video_id}`)),
        resources: resources.filter((item) => ids.has(`resource-${item.id}`)),
        seeds: seeds.filter((item) => ids.has(`seed-${item.id}`)),
      };
    },
    staleTime: 60_000,
  });

  const savedResources = query.data?.resources || [];
  const savedSeeds = query.data?.seeds || [];
  const savedVideos = query.data?.videos || [];
  const foundCount = savedVideos.length + savedResources.length + savedSeeds.length;

  return (
    <div className="min-h-screen">
      <Seo title="Избранное — 0x00 SPACE" description="Сохранённые материалы и сиды 0x00 SPACE." path="/favorites" noindex />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-10 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Твоя коллекция</p>
          <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            <Heart className="h-8 w-8 text-emerald sm:h-10 sm:w-10" /> Избранное
          </h1>
          <p className="mt-3 text-sm text-mute sm:text-base">Сохранённые видео, материалы и сиды доступны в этом браузере.</p>

          {favoriteIds.length === 0 && <div className="glass mt-8 rounded-2xl p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-mute" />
            <h2 className="mt-4 text-lg font-semibold text-ink">Пока здесь пусто</h2>
            <p className="mt-2 text-sm text-mute">Нажимайте на звёздочку у видео, материалов и сидов, чтобы сохранить их здесь.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/videos" className="button-secondary">Открыть видео</Link>
              <Link to="/materials" className="button-primary">Открыть материалы</Link>
            </div>
          </div>}

          {favoriteIds.length > 0 && query.isPending && <div className="mt-8"><ApiState status="loading" /></div>}
          {favoriteIds.length > 0 && query.isError && <div className="mt-8"><ApiState status="error" error={query.error} onRetry={query.refetch} /></div>}
          {query.isSuccess && foundCount === 0 && <div className="glass mt-8 rounded-2xl p-8 text-center">
            <p className="text-sm text-mute">Сохранённые записи не найдены. Возможно, материалы были удалены.</p>
            <button type="button" onClick={() => { localStorage.removeItem(STORAGE_KEY); window.dispatchEvent(new Event("favorites-change")); }} className="button-secondary mt-5">Очистить избранное</button>
          </div>}

          {query.isSuccess && foundCount > 0 && <>
            <p className="mt-7 text-sm text-mute">Сохранено: {foundCount}</p>
            {savedVideos.length > 0 && <section className="mt-7">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">Видео</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{savedVideos.map((video) => <VideoCard key={video.video_id} video={video} />)}</div>
            </section>}
            {savedResources.length > 0 && <section className="mt-7">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">Материалы</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{savedResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>
            </section>}
            {savedSeeds.length > 0 && <section className="mt-8">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">Сиды миров</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{savedSeeds.map((seed) => <SeedCard key={seed.id} seed={seed} />)}</div>
            </section>}
          </>}
        </div>
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

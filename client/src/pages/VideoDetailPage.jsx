import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  Eye,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import VideoCard from "../components/VideoCard.jsx";
import { getResources, getSeeds, getVideo } from "../services/api.js";
import { formatDuration, formatViews } from "../lib/utils.js";
import ShareButton from "../components/ShareButton.jsx";
import Seo from "../components/Seo.jsx";
import { absoluteUrl, breadcrumbSchema, organizationRef } from "../lib/seo.js";
import ApiState from "../components/ApiState.jsx";
import ResourceCard from "../components/ResourceCard.jsx";
import SeedCard from "../components/SeedCard.jsx";

export default function VideoDetailPage({ videoId }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideo(videoId),
    retry: false,
  });
  const video = data?.video;
  const related = data?.related || [];
  const relatedContent = useQuery({
    queryKey: ["video-related-content", video?.video_id],
    enabled: Boolean(video),
    queryFn: async () => {
      const [resources, seeds] = await Promise.all([
        getResources(undefined, undefined, { videoId: video.video_id, page: 1, limit: 6 }),
        getSeeds({ videoId: video.video_id, page: 1, limit: 6 }),
      ]);
      return { resources: resources?.items || [], seeds: seeds?.items || [] };
    },
    staleTime: 5 * 60 * 1000,
  });
  const relatedResources = relatedContent.data?.resources || [];
  const relatedSeeds = relatedContent.data?.seeds || [];
  const status = isPending
    ? "loading"
    : isError
      ? error?.status === 404
        ? "missing"
        : "error"
      : "ready";
  const errorMessage =
    error?.status === 404
      ? "Возможно, ролик ещё не загрузился или был удалён."
      : "Не удалось загрузить ролик. Проверьте соединение и попробуйте снова.";

  const videoStructuredData = video
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.title,
        description: video.description || video.title,
        thumbnailUrl: [video.thumbnail_url],
        uploadDate: video.published_at,
        contentUrl: video.url,
        embedUrl: `https://www.youtube.com/embed/${video.video_id}`,
        duration: `PT${video.duration_seconds}S`,
        isFamilyFriendly: true,
        mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/videos/${videoId}`) },
        publisher: organizationRef(),
        ...(video.view_count > 0
          ? {
              interactionStatistic: {
                "@type": "InteractionCounter",
                interactionType: { "@type": "WatchAction" },
                userInteractionCount: video.view_count,
              },
            }
          : {}),
      }
    : undefined;

  return (
    <div className="min-h-screen">
      <Seo
        title={video ? `${video.title} — 0x00 SPACE` : "Видео — 0x00 SPACE"}
        description={video?.description || "Видео и игровые истории 0x00 SPACE."}
        path={`/videos/${videoId}`}
        image={video?.thumbnail_url}
        type="video.other"
        structuredData={
          video
            ? [
                videoStructuredData,
                breadcrumbSchema([
                  { name: "Главная", path: "/" },
                  { name: "Видео", path: "/videos" },
                  { name: video.title, path: `/videos/${videoId}` },
                ]),
              ]
            : breadcrumbSchema([
                { name: "Главная", path: "/" },
                { name: "Видео", path: "/videos" },
              ])
        }
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-8 sm:py-14">
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-emerald"
        >
          <ArrowLeft className="h-4 w-4" /> Все видео
        </Link>

        {status === "loading" && <ApiState status="loading" />}
        {(status === "missing" || status === "error") && (
          <div className="py-28 text-center">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {status === "error" ? "Не удалось загрузить видео" : "Видео не найдено"}
            </h1>
            <div className="mx-auto mt-6 max-w-lg">
              <ApiState
                status="error"
                error={error}
                message={error?.status === 404 ? errorMessage : undefined}
                onRetry={status === "error" ? refetch : undefined}
              />
            </div>
          </div>
        )}

        {video && (
          <article className="mt-7">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-start">
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-3xl border border-line bg-panel/70 shadow-2xl shadow-black/30"
              >
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  width="1280"
                  height="720"
                  fetchpriority="high"
                  decoding="async"
                  className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-void/65 text-ink shadow-2xl backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald group-hover:text-void">
                    <Play className="ml-1 h-6 w-6" fill="currentColor" />
                  </span>
                </span>
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-void/80 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur-sm">
                  Смотреть на YouTube
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>

              <div>
                <p className="eyebrow">Видео 0x00 SPACE</p>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                  {video.title}
                </h1>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="chip cursor-default">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViews(video.view_count)}
                  </span>
                  <span className="chip cursor-default">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(video.published_at).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="chip cursor-default">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDuration(video.duration_seconds)}
                  </span>
                  {video.is_short && (
                    <span className="chip cursor-default border-violet/40 text-violet">Shorts</span>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="button-primary"
                  >
                    <Play className="h-4 w-4" fill="currentColor" />
                    Смотреть на YouTube
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <ShareButton title={video.title} />
                </div>
              </div>
            </div>

            {video.description && (
              <section className="glass mt-8 rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold text-ink">Описание</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mute">
                  {video.description}
                </p>
              </section>
            )}

            {(relatedResources.length > 0 || relatedSeeds.length > 0) && (
              <section className="mt-12" aria-labelledby="related-content-title">
                <p className="eyebrow">Продолжение</p>
                <h2 id="related-content-title" className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
                  Материалы к этому видео
                </h2>
                {relatedResources.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedResources.map((resource) => <ResourceCard key={resource.id} resource={resource} excludeVideoId={video.video_id} />)}
                </div>}
                {relatedSeeds.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedSeeds.map((seed) => <SeedCard key={seed.id} seed={seed} excludeVideoId={video.video_id} />)}
                </div>}
                <Link to="/materials" className="button-secondary mt-5">Смотреть все материалы</Link>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Дальше</p>
                    <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
                      Другие ролики
                    </h2>
                  </div>
                  <Link to="/videos" className="link-arrow hidden sm:inline-flex">
                    Все видео
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  {related.map((item) => (
                    <VideoCard key={item.video_id} video={item} />
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}

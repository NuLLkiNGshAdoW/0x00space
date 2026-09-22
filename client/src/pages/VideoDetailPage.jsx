import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import VideoCard from "../components/VideoCard.jsx";
import { getVideo } from "../services/api.js";
import ShareButton from "../components/ShareButton.jsx";
import Seo from "../components/Seo.jsx";
import ApiState from "../components/ApiState.jsx";

export default function VideoDetailPage({ videoId }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideo(videoId),
    retry: false,
  });
  const video = data?.video;
  const related = data?.related || [];
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
        structuredData={videoStructuredData}
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-12 sm:py-20">
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-emerald"
        >
          <ArrowLeft className="h-4 w-4" /> Все видео
        </Link>
        {status === "loading" && <ApiState status="loading" />}
        {(status === "missing" || status === "error") && (
          <div className="py-32 text-center">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {status === "error" ? "Не удалось загрузить видео" : "Видео не найдено"}
            </h1>
            <div className="mt-6">
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
          <article className="mx-auto mt-10 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-line bg-panel/70 shadow-2xl">
              <img
                src={video.thumbnail_url}
                alt={video.title}
                width="1280"
                height="720"
                fetchpriority="high"
                decoding="async"
                className="aspect-video w-full object-cover"
              />
            </div>
            <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald">
                  Видео 0x00 SPACE
                </p>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-5xl">
                  {video.title}
                </h1>
                <p className="mt-4 text-sm text-mute">
                  Опубликовано: {new Date(video.published_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="button-primary shrink-0"
                >
                  <Play className="h-4 w-4" fill="currentColor" /> Смотреть на YouTube{" "}
                  <ExternalLink className="h-4 w-4" />
                </a>
                <ShareButton title={video.title} />
              </div>
            </div>
            {video.description && (
              <p className="mt-7 max-w-3xl whitespace-pre-line text-base leading-relaxed text-mute">
                {video.description}
              </p>
            )}
            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="font-display text-2xl font-semibold text-ink">Другие ролики</h2>
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

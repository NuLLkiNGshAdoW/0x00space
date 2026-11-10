import { lazy, Suspense } from "react";
import { ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { absoluteUrl, breadcrumbSchema, SITE_NAME } from "../lib/seo.js";

const LazyYouTubeGallery = lazy(() => import("../components/YouTubeGallery.jsx"));
const LazyResourcesAndGuides = lazy(() => import("../components/ResourcesAndGuides.jsx"));

export default function CollectionPage({ type }) {
  const isVideos = type === "videos";
  const title = isVideos ? "Видео" : "Материалы";
  const pageTitle = isVideos ? "Видео" : "Материалы и сиды Minecraft";
  const path = isVideos ? "/videos" : "/materials";
  const structuredData = [
    breadcrumbSchema([
      { name: "Главная", path: "/" },
      { name: title, path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${pageTitle} — ${SITE_NAME}`,
      url: absoluteUrl(path),
      inLanguage: "ru-RU",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title={`${pageTitle} — 0x00 SPACE`}
        description={
          isVideos
            ? "Последние видео и Shorts 0x00 SPACE о Minecraft, кооп-играх и хоррорах."
            : "Моды, шейдеры, текстуры, гайды и сиды Minecraft из роликов 0x00 SPACE."
        }
        path={path}
        structuredData={structuredData}
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="pt-6 sm:pt-10">
        <div className="container-app">
          <nav aria-label="Хлебные крошки" className="flex items-center gap-1.5 text-xs text-mute">
            <Link to="/" className="transition-colors hover:text-emerald">
              Главная
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-ink">{isVideos ? "Видео" : "Материалы"}</span>
          </nav>

          <div className="page-intro mt-7 max-w-3xl">
            <p className="eyebrow">{isVideos ? "Медиатека" : "Арсенал игрока"}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              {isVideos ? "Видео 0x00 SPACE" : "Материалы и сиды Minecraft"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute sm:text-base">
              {isVideos
                ? "Все ролики и Shorts канала в одном месте: ищите по названию, фильтруйте формат и открывайте выпуск."
                : "Моды, шейдеры, текстур-паки, гайды и сиды миров. Фильтруйте по игре и забирайте то, что пригодится в следующем прохождении."}
            </p>
          </div>
        </div>

        <Suspense fallback={<CollectionLoadingState />}>
          {isVideos ? <LazyYouTubeGallery /> : <LazyResourcesAndGuides />}
        </Suspense>
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

function CollectionLoadingState() {
  return (
    <div className="container-app py-12 sm:py-16" role="status" aria-live="polite">
      <div className="glass h-32 animate-pulse rounded-2xl" aria-hidden="true" />
      <span className="sr-only">Загружаем материалы каталога…</span>
    </div>
  );
}

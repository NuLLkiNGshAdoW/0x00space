import { BrowserRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import HeroSection from "./components/HeroSection.jsx";
import YouTubeGallery from "./components/YouTubeGallery.jsx";
import ResourcesAndGuides from "./components/ResourcesAndGuides.jsx";
import ApplicationForm from "./components/ApplicationForm.jsx";
import Footer from "./components/Footer.jsx";
import AboutAndFaq from "./components/AboutAndFaq.jsx";
import ProfileBackdrop from "./components/ProfileBackdrop.jsx";
import TelegramFloat from "./components/TelegramFloat.jsx";
import FeaturedVideos from "./components/FeaturedVideos.jsx";
import CommunityBenefits from "./components/CommunityBenefits.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";
import Seo from "./components/Seo.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const LazyAdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const LazyVideoDetailPage = lazy(() => import("./pages/VideoDetailPage.jsx"));
const LazyEventsPage = lazy(() => import("./pages/EventsPage.jsx"));
const LazyMaterialsPage = lazy(() => import("./pages/MaterialsPage.jsx"));
const LazyGuidesPage = lazy(() => import("./pages/GuidesPage.jsx"));
const LazySeedsPage = lazy(() => import("./pages/SeedsPage.jsx"));
const LazyContentPage = lazy(() => import("./pages/ContentPage.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/admin"
            element={
              <LazyRoute>
                <LazyAdminPage />
              </LazyRoute>
            }
          />
          <Route path="/videos" element={<CollectionPage type="videos" />} />
          <Route path="/videos/:videoId" element={<VideoRoute />} />
          <Route
            path="/materials"
            element={
              <LazyRoute>
                <LazyMaterialsPage />
              </LazyRoute>
            }
          />
          <Route
            path="/events"
            element={
              <LazyRoute>
                <LazyEventsPage />
              </LazyRoute>
            }
          />
          <Route
            path="/guides"
            element={
              <LazyRoute>
                <LazyGuidesPage />
              </LazyRoute>
            }
          />
          <Route
            path="/seeds"
            element={
              <LazyRoute>
                <LazySeedsPage />
              </LazyRoute>
            }
          />
          {["about", "faq", "contacts", "privacy"].map((page) => (
            <Route
              key={page}
              path={`/${page}`}
              element={
                <LazyRoute>
                  <LazyContentPage path={`/${page}`} />
                </LazyRoute>
              }
            />
          ))}
          <Route
            path="*"
            element={
              <LazyRoute>
                <LazyContentPage path="/not-found" />
              </LazyRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}

function HomePage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      [
        "Как попасть на игровой ивент?",
        "Заполните заявку ниже и укажите свой ник, контакт и игру. Мы свяжемся с подходящими участниками.",
      ],
      [
        "В какие игры вы играете?",
        "Основные направления канала — Minecraft, кооперативные игры, хорроры и инди-проекты.",
      ],
      [
        "Где найти моды и сиды из роликов?",
        "Материалы и сиды публикуются в разделе выше. Используйте фильтр по игре и кнопки скачивания или копирования.",
      ],
      [
        "Можно предложить идею для видео?",
        "Да. Напишите идею в форме заявки — лучшие предложения мы добавляем в план будущих роликов.",
      ],
    ].map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    })),
  };
  return (
    <div className="min-h-screen">
      <Seo
        title="0x00 SPACE — Minecraft, кооп и хорроры"
        description="0x00 SPACE — игровой канал о Minecraft, кооперативных играх и хоррорах. Видео, гайды, сиды миров и игровые ивенты."
        path="/"
        structuredData={faqSchema}
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <FeaturedVideos />
        <CommunityBenefits />
        <YouTubeGallery />
        <ResourcesAndGuides />
        <AboutAndFaq />
        <ApplicationForm />
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

function VideoRoute() {
  const { videoId } = useParams();
  return (
    <LazyRoute>
      <LazyVideoDetailPage videoId={videoId} />
    </LazyRoute>
  );
}

function LazyRoute({ children }) {
  return (
    <ErrorBoundary
      reloadOnReset
      title="Раздел временно недоступен"
      description="Не удалось загрузить этот раздел. Попробуйте обновить страницу."
    >
      {children}
    </ErrorBoundary>
  );
}

function RouteLoadingFallback() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-void px-5 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="glass flex items-center gap-3 rounded-2xl px-6 py-5 text-sm text-mute">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-emerald border-t-transparent"
          aria-hidden="true"
        />
        Загружаем раздел…
      </div>
    </main>
  );
}

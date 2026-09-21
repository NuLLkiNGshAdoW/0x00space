import { BrowserRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import HeroSection from "./components/HeroSection.jsx";
import YouTubeGallery from "./components/YouTubeGallery.jsx";
import ResourcesAndGuides from "./components/ResourcesAndGuides.jsx";
import ApplicationForm from "./components/ApplicationForm.jsx";
import Footer from "./components/Footer.jsx";
import AboutAndFaq from "./components/AboutAndFaq.jsx";
import ContentPage from "./pages/ContentPage.jsx";
import ProfileBackdrop from "./components/ProfileBackdrop.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import TelegramFloat from "./components/TelegramFloat.jsx";
import FeaturedVideos from "./components/FeaturedVideos.jsx";
import CommunityBenefits from "./components/CommunityBenefits.jsx";
import VideoDetailPage from "./pages/VideoDetailPage.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";
import Seo from "./components/Seo.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/videos" element={<CollectionPage type="videos" />} />
        <Route path="/videos/:videoId" element={<VideoRoute />} />
        <Route path="/materials" element={<CollectionPage type="materials" />} />
        {["guides", "seeds", "about", "faq", "events", "contacts", "privacy"].map((page) => (
          <Route key={page} path={`/${page}`} element={<ContentPage path={`/${page}`} />} />
        ))}
        <Route path="*" element={<ContentPage path="/not-found" />} />
      </Routes>
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
  return <VideoDetailPage videoId={videoId} />;
}

import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import YouTubeGallery from "../components/YouTubeGallery.jsx";
import ResourcesAndGuides from "../components/ResourcesAndGuides.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

export default function CollectionPage({ type }) {
  const isVideos = type === "videos";
  return (
    <div className="min-h-screen">
      <Seo title={`${isVideos ? "Видео" : "Материалы"} — 0x00 SPACE`} description={isVideos ? "Последние видео и Shorts 0x00 SPACE." : "Материалы, моды, шейдеры и сиды Minecraft от 0x00 SPACE."} path={isVideos ? "/videos" : "/materials"} />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="pt-8">
        <div className="container-app mb-2">
          <Link to="/" className="text-sm text-ink hover:text-emerald">
            ← На главную
          </Link>
        </div>
        {isVideos ? <YouTubeGallery /> : <ResourcesAndGuides />}
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

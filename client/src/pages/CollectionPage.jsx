import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import YouTubeGallery from "../components/YouTubeGallery.jsx";
import ResourcesAndGuides from "../components/ResourcesAndGuides.jsx";

export default function CollectionPage({ type }) {
  const isVideos = type === "videos";
  return (
    <div className="min-h-screen">
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="pt-8">
        <div className="container-app mb-2">
          <a href="/" className="text-sm text-mute hover:text-emerald">← На главную</a>
        </div>
        {isVideos ? <YouTubeGallery /> : <ResourcesAndGuides />}
      </main>
      <Footer />
    </div>
  );
}

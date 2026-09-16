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
import CollectionPage from "./pages/CollectionPage.jsx";

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/admin") return <AdminPage />;
  if (path === "/videos") return <CollectionPage type="videos" />;
  if (path === "/materials") return <CollectionPage type="materials" />;
  if (path !== "/") return <ContentPage path={path} />;

  return (
    <div className="min-h-screen">
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <YouTubeGallery />
        <ResourcesAndGuides />
        <AboutAndFaq />
        <ApplicationForm />
      </main>
      <Footer />
    </div>
  );
}

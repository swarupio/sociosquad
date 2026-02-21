import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import NSSImpactGallery from "@/components/NSSImpactGallery";
import BentoGrid from "@/components/BentoGrid";
import AIRecommendations from "@/components/AIRecommendations";
import CauseCompass from "@/components/CauseCompass";
import GlobalImpact from "@/components/GlobalImpact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <NSSImpactGallery />
      <BentoGrid />
      <AIRecommendations />
      <CauseCompass />
      <GlobalImpact />
      <Footer />
    </div>
  );
};

export default Index;

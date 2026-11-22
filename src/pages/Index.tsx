import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";

// Below-the-fold sections are code-split (Swiper etc. stay out of the initial bundle).
const NSSImpactGallery = lazy(() => import("@/components/NSSImpactGallery"));
const BentoGrid = lazy(() => import("@/components/BentoGrid"));
const AIRecommendations = lazy(() => import("@/components/AIRecommendations"));
const CauseCompass = lazy(() => import("@/components/CauseCompass"));
const GlobalImpact = lazy(() => import("@/components/GlobalImpact"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <Suspense fallback={<div className="min-h-[400px]" aria-hidden="true" />}>
        <NSSImpactGallery />
        <BentoGrid />
        <AIRecommendations />
        <CauseCompass />
        <GlobalImpact />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Index;

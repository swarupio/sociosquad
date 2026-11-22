import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";

// Below-the-fold sections are code-split (Swiper etc. stay out of the initial bundle).
const NSSImpactGallery = lazy(() => import("@/components/NSSImpactGallery"));
const BentoGrid = lazy(() => import("@/components/BentoGrid"));
const AIRecommendations = lazy(() => import("@/components/AIRecommendations"));
const CauseCompass = lazy(() => import("@/components/CauseCompass"));
const GlobalImpact = lazy(() => import("@/components/GlobalImpact"));

const Index = () => {
  usePageMeta({ title: "Make your impact count", description: "SocioSquad connects volunteers with verified NGOs. Find opportunities near you, build squads, track verified hours and earn certificates.", path: "/" });
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

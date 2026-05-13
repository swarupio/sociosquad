import { Analytics } from "@vercel/analytics/react"; // Use /react for Vite
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Community = lazy(() => import("./pages/Community"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Squads = lazy(() => import("./pages/Squads"));
const NGORegister = lazy(() => import("./pages/NGORegister"));
const NGODashboard = lazy(() => import("./pages/NGODashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ScrollToTopOnRouteChange = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTopOnRouteChange />
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/community" element={<Community />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:id" element={<OpportunityDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/squads" element={<Squads />} />
            <Route path="/squads/:id" element={<Squads />} />
            <Route path="/ngo/register" element={<NGORegister />} />
            <Route path="/ngo/dashboard" element={<NGODashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {/* Placing Analytics here ensures it tracks every route 
          defined in your BrowserRouter above. 
      */}
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
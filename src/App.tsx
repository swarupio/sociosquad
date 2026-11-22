import { Analytics } from "@vercel/analytics/react"; // Use /react for Vite
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { isClientError } from "@/lib/api";

const AuthCallback = lazy(() => import("./pages/AuthCallback"));

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
const Admin = lazy(() => import("./pages/admin/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isClientError(error)) return false;
        return failureCount < 2;
      },
    },
  },
});

const PageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

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
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/community" element={<Community />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/opportunities/:id" element={<OpportunityDetail />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                <Route path="/squads" element={<Squads />} />
                <Route path="/squads/:id" element={<Squads />} />
                <Route path="/ngo/register" element={<ProtectedRoute><NGORegister /></ProtectedRoute>} />
                <Route path="/ngo/dashboard" element={<ProtectedRoute><NGODashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/admin/:section" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
      {/* Placing Analytics here ensures it tracks every route 
          defined in your BrowserRouter above. 
      */}
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
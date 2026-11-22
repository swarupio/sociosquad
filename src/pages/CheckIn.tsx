import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VolunteerCheckin } from "@/components/checkin/VolunteerCheckin";
import { useAuth } from "@/hooks/useAuth";

export default function CheckIn() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, isReady } = useAuth();
  const code = params.get("code") ?? undefined;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-24">
        <Card className="glass-card w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Event check-in</CardTitle>
            <CardDescription>Scan the organizer's QR code or enter the code to mark your attendance.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isReady ? (
              <div className="flex justify-center py-6" role="status" aria-label="Loading">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !user ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">Please sign in to check in to your event.</p>
                <Button asChild>
                  <Link to={`/auth?next=${next}`}>Sign in</Link>
                </Button>
              </div>
            ) : (
              <VolunteerCheckin initialCode={code} autoSubmit={!!code} />
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

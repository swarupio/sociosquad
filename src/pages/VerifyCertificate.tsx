import { useParams } from "react-router-dom";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { isMissingMigration } from "@/lib/db";
import { formatCode, formatPeriod, normalizeCode } from "@/lib/certificates";
import { useVerifyCertificate } from "@/hooks/useCertificates";

export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, isError, error } = useVerifyCertificate(code);
  const display = formatCode(code);

  let body: JSX.Element;
  if (isLoading) {
    body = <Skeleton className="h-40 w-full" />;
  } else if (isError) {
    body = (
      <div role="alert" className="text-center space-y-2">
        <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true" />
        <h2 className="text-xl font-semibold">
          {isMissingMigration(error) ? "Verification is not enabled yet" : "Could not verify right now"}
        </h2>
        <p className="text-sm text-muted-foreground">Please try again later.</p>
      </div>
    );
  } else if (data?.revoked) {
    body = (
      <div role="status" className="text-center space-y-2">
        <XCircle className="h-10 w-10 mx-auto text-destructive" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-destructive">Certificate revoked</h2>
        <p className="text-sm text-muted-foreground">
          This certificate (code {display}) was issued but has since been revoked and is no longer valid.
        </p>
      </div>
    );
  } else if (data?.valid) {
    body = (
      <div role="status" className="space-y-4 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Valid certificate</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm text-left max-w-sm mx-auto">
          <dt className="text-muted-foreground">Volunteer</dt>
          <dd className="font-medium">{data.volunteer_name}</dd>
          <dt className="text-muted-foreground">Verified hours</dt>
          <dd className="font-medium">{Number(data.total_hours)}</dd>
          <dt className="text-muted-foreground">Events</dt>
          <dd className="font-medium">{data.events_count}</dd>
          {data.causes && data.causes.length > 0 && (
            <>
              <dt className="text-muted-foreground">Causes</dt>
              <dd className="font-medium">{data.causes.join(", ")}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Period</dt>
          <dd className="font-medium">{formatPeriod(data.period_start, data.period_end)}</dd>
          <dt className="text-muted-foreground">Issued</dt>
          <dd className="font-medium">{data.issued_at ? new Date(data.issued_at).toLocaleDateString("en-IN") : "-"}</dd>
        </dl>
      </div>
    );
  } else {
    body = (
      <div role="status" className="text-center space-y-2">
        <XCircle className="h-10 w-10 mx-auto text-destructive" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Certificate not found</h2>
        <p className="text-sm text-muted-foreground">
          {normalizeCode(code) ? `No certificate matches code ${display}.` : "No code provided."} Check the code and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-xl">
        <h1 className="text-3xl font-bold text-center mb-2">Verify impact certificate</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">Code: {display || "-"}</p>
        <div className="glass-card rounded-2xl border border-border p-6 sm:p-8" aria-live="polite">
          {body}
        </div>
      </main>
      <Footer />
    </div>
  );
}

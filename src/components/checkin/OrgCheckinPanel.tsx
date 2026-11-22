import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Printer, RefreshCw, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useOrgCheckinCode } from "@/hooks/useCheckin";
import { buildCheckinUrl, formatCode, formatCountdown, secondsUntil } from "@/lib/checkin";

interface OrgCheckinPanelProps {
  opportunityId: string;
  opportunityTitle: string;
}

export function OrgCheckinPanel({ opportunityId, opportunityTitle }: OrgCheckinPanelProps) {
  const { toast } = useToast();
  const { data, isLoading, error, rotate, notEnabled } = useOrgCheckinCode(opportunityId);
  const [qr, setQr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const code = data?.code;
  const expiresAt = data?.expires_at;
  const url = code ? buildCheckinUrl(window.location.origin, code) : "";

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: "M" })
      .then((d) => {
        if (!cancelled) setQr(d);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(secondsUntil(expiresAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const expired = !!code && remaining <= 0;

  const handleRotate = () =>
    rotate.mutate(120, {
      onError: (e) => toast({ title: "Could not generate code", description: e.message, variant: "destructive" }),
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Check-in link copied" });
    } catch {
      toast({ title: "Copy failed", description: url, variant: "destructive" });
    }
  };

  if (notEnabled) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-sm text-muted-foreground">
          QR check-in is not enabled yet. Please try again later.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card print:border-0 print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" aria-hidden="true" /> Event check-in
        </CardTitle>
        <CardDescription>
          Volunteers scan this code or type it in to be marked present for {opportunityTitle}. You still verify hours
          afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {isLoading ? (
          <Skeleton className="h-64 w-64" />
        ) : code ? (
          <>
            {qr ? (
              <img
                src={qr}
                alt={`QR code to check in to ${opportunityTitle}`}
                width={256}
                height={256}
                className="rounded-lg bg-white p-2"
              />
            ) : (
              <Skeleton className="h-64 w-64" />
            )}
            <p className="font-mono text-4xl font-bold tracking-widest" aria-label={`Check-in code ${code.split("").join(" ")}`}>
              {formatCode(code)}
            </p>
            <p className={`text-sm ${expired ? "text-destructive" : "text-muted-foreground"}`} role="timer" aria-live="off">
              {expired ? "Code expired. Rotate to issue a new one." : `Expires in ${formatCountdown(remaining)}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No active code yet. Generate one when the event starts.</p>
        )}

        {error && !notEnabled && (
          <p className="text-sm text-destructive" role="alert">
            {(error as Error).message}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 print:hidden">
          <Button onClick={handleRotate} disabled={rotate.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${rotate.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
            {code ? "Rotate code" : "Generate code"}
          </Button>
          {code && (
            <>
              <Button variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copy link
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" aria-hidden="true" /> Print
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OrgCheckinPanel;

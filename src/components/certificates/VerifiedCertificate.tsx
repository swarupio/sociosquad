import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Award, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildVerifyUrl, formatCode, formatPeriod, type CertificateRow } from "@/lib/certificates";

interface Props {
  certificate: CertificateRow;
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #verified-certificate, #verified-certificate * { visibility: visible !important; }
  #verified-certificate { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 2px solid #111 !important; background: #fff !important; color: #111 !important; }
  .no-print { display: none !important; }
}
`;

export default function VerifiedCertificate({ certificate }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const url = buildVerifyUrl(typeof window !== "undefined" ? window.location.origin : "", certificate.code);
  const revoked = !!certificate.revoked_at;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 192, errorCorrectionLevel: "M" })
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

  return (
    <div className="space-y-3">
      <style>{PRINT_CSS}</style>
      <section
        id="verified-certificate"
        aria-label="Verified impact certificate"
        className="glass-card rounded-2xl border border-border p-6 sm:p-8 text-center space-y-4"
      >
        <Award className="h-10 w-10 mx-auto text-primary" aria-hidden="true" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">SocioSquad Verified Impact Certificate</p>
        <p className="text-sm text-muted-foreground">This certifies that</p>
        <h2 className="text-2xl sm:text-3xl font-bold">{certificate.volunteer_name || "Volunteer"}</h2>
        <p className="text-sm text-muted-foreground">
          contributed <strong className="text-foreground">{Number(certificate.total_hours)} verified hours</strong> across{" "}
          <strong className="text-foreground">{certificate.events_count}</strong> events
        </p>
        {certificate.causes?.length > 0 && (
          <p className="text-sm text-muted-foreground">Causes: {certificate.causes.join(", ")}</p>
        )}
        <p className="text-sm text-muted-foreground">Period: {formatPeriod(certificate.period_start, certificate.period_end)}</p>
        {revoked && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            This certificate has been revoked.
          </p>
        )}
        <div className="flex flex-col items-center gap-2 pt-2">
          {qr ? (
            <img
              src={qr}
              width={128}
              height={128}
              alt={`QR code linking to the verification page for certificate ${formatCode(certificate.code)}`}
            />
          ) : (
            <div className="h-32 w-32 rounded bg-muted animate-pulse" aria-hidden="true" />
          )}
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verify at {url}
          </p>
          <p className="font-mono text-sm">{formatCode(certificate.code)}</p>
          <p className="text-xs text-muted-foreground">Issued {new Date(certificate.issued_at).toLocaleDateString("en-IN")}</p>
        </div>
      </section>
      <div className="no-print flex justify-center">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" aria-hidden="true" /> Print / Save as PDF
        </Button>
      </div>
    </div>
  );
}

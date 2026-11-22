import { useState } from "react";
import { Copy, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isMissingMigration } from "@/lib/db";
import { buildVerifyUrl, formatCode, formatPeriod, type CertificateRow } from "@/lib/certificates";
import { useIssueCertificate, useMyCertificates } from "@/hooks/useCertificates";
import VerifiedCertificate from "./VerifiedCertificate";

type PeriodKey = "all" | "year" | "90d" | "30d";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeFor(key: PeriodKey): { from: string | null; to: string | null } {
  const now = new Date();
  if (key === "all") return { from: null, to: null };
  if (key === "year") return { from: `${now.getFullYear()}-01-01`, to: isoDay(now) };
  const days = key === "90d" ? 90 : 30;
  return { from: isoDay(new Date(now.getTime() - days * 86_400_000)), to: isoDay(now) };
}

export default function IssueCertificateCard() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [selected, setSelected] = useState<CertificateRow | null>(null);
  const list = useMyCertificates();
  const issue = useIssueCertificate();

  const handleIssue = () => {
    issue.mutate(rangeFor(period), {
      onSuccess: (cert) => {
        setSelected(cert);
        toast({ title: "Certificate issued", description: `Code ${formatCode(cert.code)}` });
      },
      onError: (e) => {
        const msg = isMissingMigration(e)
          ? "Verified certificates are not enabled yet."
          : e instanceof Error
            ? e.message
            : "Could not issue certificate";
        toast({ title: "Could not issue certificate", description: msg, variant: "destructive" });
      },
    });
  };

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildVerifyUrl(window.location.origin, code));
      toast({ title: "Verification link copied" });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const disabled = list.isError && isMissingMigration(list.error);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5" aria-hidden="true" /> Verified certificate
        </CardTitle>
        <CardDescription>
          Issued only for hours verified by organizers. Anyone can confirm it with a link or QR code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {disabled ? (
          <p className="text-sm text-muted-foreground">Verified certificates are not enabled yet. Please check back soon.</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cert-period">Period</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                  <SelectTrigger id="cert-period" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="year">This year</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleIssue} disabled={issue.isPending}>
                {issue.isPending ? "Issuing..." : "Get verified certificate"}
              </Button>
            </div>

            {selected && <VerifiedCertificate certificate={selected} />}

            <div aria-live="polite">
              {list.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : list.isError ? (
                <p className="text-sm text-destructive">Could not load your certificates.</p>
              ) : (list.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
              ) : (
                <ul className="space-y-2">
                  {list.data!.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                      <button type="button" className="text-left min-w-0" onClick={() => setSelected(c)}>
                        <span className="font-mono text-sm">{formatCode(c.code)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {Number(c.total_hours)} h · {formatPeriod(c.period_start, c.period_end)}
                        </span>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.revoked_at && <Badge variant="destructive">Revoked</Badge>}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyLink(c.code)}
                          aria-label={`Copy verification link for ${formatCode(c.code)}`}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

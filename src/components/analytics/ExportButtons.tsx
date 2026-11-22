import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import {
  buildImpactReport,
  type DateRange,
  type OpportunityRow,
  type OrgSummary,
} from "@/lib/orgAnalytics";

const columns: CsvColumn<OpportunityRow>[] = [
  { header: "Opportunity", value: (r) => r.title },
  { header: "Date", value: (r) => r.date },
  { header: "Category", value: (r) => r.category },
  { header: "Capacity", value: (r) => r.max_volunteers },
  { header: "Registered", value: (r) => r.registered },
  { header: "Attended", value: (r) => r.attended },
  { header: "Verified hours", value: (r) => r.hours },
  { header: "Fill rate %", value: (r) => Math.round(r.fill_rate * 100) },
];

interface ExportButtonsProps {
  rows: OpportunityRow[];
  summary: OrgSummary | undefined;
  orgName: string;
  range: DateRange;
}

export function ExportButtons({ rows, summary, orgName, range }: ExportButtonsProps) {
  const { toast } = useToast();

  const onCsv = () => {
    downloadCsv(`impact-${range.from}-to-${range.to}.csv`, toCsv(rows, columns, { bom: true }));
  };

  const onCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(buildImpactReport(summary, orgName, range));
      toast({ title: "Impact report copied", description: "Paste it into your grant report or email." });
    } catch {
      toast({ title: "Could not copy", description: "Clipboard access was blocked.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCsv} disabled={rows.length === 0}>
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        Download CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={!summary}>
        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
        Copy impact report
      </Button>
    </div>
  );
}

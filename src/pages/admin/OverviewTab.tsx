import { useQuery } from "@tanstack/react-query";
import AsyncStateCard from "@/components/AsyncStateCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOverview, type OverviewCounts } from "@/lib/adminApi";
import { errorDescription } from "./DataPanel";

const OverviewTab = () => {
  const query = useQuery<OverviewCounts, Error>({ queryKey: ["admin", "overview"], queryFn: fetchOverview, retry: false });

  if (query.isLoading) return <AsyncStateCard loading title="Loading..." />;
  if (query.isError || !query.data) {
    return <AsyncStateCard title="Could not load overview" description={errorDescription(query.error)} onRetry={() => void query.refetch()} />;
  }
  const d = query.data;
  const stats: { label: string; value: number }[] = [
    { label: "Volunteers", value: d.volunteers },
    { label: "Organizations", value: d.organizations },
    { label: "Verified organizations", value: d.verifiedOrgs },
    { label: "Unverified organizations", value: d.unverifiedOrgs },
    { label: "Opportunities", value: d.opportunities },
    { label: "Registrations", value: d.registrations },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-display font-bold text-foreground">{s.value.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OverviewTab;

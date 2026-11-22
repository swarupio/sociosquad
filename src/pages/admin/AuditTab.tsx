import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAuditLog, type AuditEntry } from "@/lib/adminApi";
import DataPanel from "./DataPanel";

const AuditTab = () => (
  <DataPanel<AuditEntry>
    queryKey="audit"
    searchPlaceholder="Search by action or target"
    emptyTitle="No audit entries yet"
    fetchPage={fetchAuditLog}
    renderTable={(rows) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
              <TableCell className="font-medium">{r.action}</TableCell>
              <TableCell>
                {r.target_type}
                {r.target_id ? <span className="text-muted-foreground"> {r.target_id.slice(0, 8)}</span> : null}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.admin_id.slice(0, 8)}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{JSON.stringify(r.details)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  />
);

export default AuditTab;

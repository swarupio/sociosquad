import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchOrganizations, setOrgVerified, type AdminOrg } from "@/lib/adminApi";
import DataPanel, { errorDescription } from "./DataPanel";

const OrganizationsTab = () => {
  const qc = useQueryClient();
  const [target, setTarget] = useState<AdminOrg | null>(null);

  const mutation = useMutation<void, Error, { org: AdminOrg; verified: boolean }>({
    mutationFn: ({ org, verified }) => setOrgVerified(org.id, verified),
    onSuccess: (_d, { org, verified }) => {
      toast.success(`${org.name} ${verified ? "verified" : "unverified"}`);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(errorDescription(e)),
    onSettled: () => setTarget(null),
  });

  return (
    <>
      <DataPanel<AdminOrg>
        queryKey="organizations"
        searchPlaceholder="Search by name, email or city"
        emptyTitle="No organizations found"
        fetchPage={fetchOrganizations}
        renderTable={(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{o.contact_email}</TableCell>
                  <TableCell>{o.city ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={o.verified ? "default" : "secondary"}>{o.verified ? "Verified" : "Unverified"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setTarget(o)}>
                      {o.verified ? "Unverify" : "Verify"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      />
      <AlertDialog open={target !== null} onOpenChange={(o) => !o && !mutation.isPending && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.verified ? "Unverify" : "Verify"} organization?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.name} will be marked as {target?.verified ? "unverified" : "verified"}. This action is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (target) mutation.mutate({ org: target, verified: !target.verified });
              }}
            >
              {mutation.isPending ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrganizationsTab;

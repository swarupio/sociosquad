import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { APP_ROLES, fetchUsers, setUserRole, type AdminUser, type AppRole } from "@/lib/adminApi";
import DataPanel, { errorDescription } from "./DataPanel";

type Mode = "grant" | "revoke";

const isAppRole = (v: string): v is AppRole => (APP_ROLES as string[]).includes(v);

const UsersTab = () => {
  const qc = useQueryClient();
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<AppRole>("volunteer");
  const [mode, setMode] = useState<Mode>("grant");

  const mutation = useMutation<void, Error, { user: AdminUser; role: AppRole; mode: Mode }>({
    mutationFn: (v) => setUserRole(v.user.user_id, v.role, v.mode === "grant"),
    onSuccess: (_d, v) => {
      toast.success(`${v.mode === "grant" ? "Granted" : "Revoked"} ${v.role} for ${v.user.full_name ?? "user"}`);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(errorDescription(e)),
    onSettled: () => setTarget(null),
  });

  return (
    <>
      <DataPanel<AdminUser>
        queryKey="users"
        searchPlaceholder="Search by name"
        emptyTitle="No users found"
        fetchPage={fetchUsers}
        renderTable={(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name ?? "Unnamed user"}</TableCell>
                  <TableCell className="space-x-1">
                    {u.roles.length === 0 ? <span className="text-muted-foreground">none</span> : u.roles.map((r) => <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}
                  </TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRole("volunteer");
                        setMode("grant");
                        setTarget(u);
                      }}
                    >
                      Change role
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
            <AlertDialogTitle>Change role</AlertDialogTitle>
            <AlertDialogDescription>
              Grant or revoke a role for {target?.full_name ?? "this user"}. This action is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <Select value={mode} onValueChange={(v) => setMode(v === "revoke" ? "revoke" : "grant")}>
              <SelectTrigger aria-label="Action"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">Grant</SelectItem>
                <SelectItem value="revoke">Revoke</SelectItem>
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(v) => isAppRole(v) && setRole(v)}>
              <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {APP_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (target) mutation.mutate({ user: target, role, mode });
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

export default UsersTab;

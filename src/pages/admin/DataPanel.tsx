import { useEffect, useState, type ReactNode } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import AsyncStateCard from "@/components/AsyncStateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_PAGE_SIZE, MIGRATION_HINT, AdminApiError, type Page } from "@/lib/adminApi";

interface DataPanelProps<T> {
  queryKey: string;
  searchPlaceholder: string;
  emptyTitle: string;
  fetchPage: (page: number, search: string) => Promise<Page<T>>;
  /** Renders the whole <Table> for the current rows. */
  renderTable: (rows: T[]) => ReactNode;
}

export const errorDescription = (e: unknown): string =>
  e instanceof AdminApiError && e.migrationMissing ? MIGRATION_HINT : e instanceof Error ? e.message : "Unexpected error";

/** Shared searchable + paginated (20/page) list with loading, error and empty states. */
function DataPanel<T>({ queryKey, searchPlaceholder, emptyTitle, fetchPage, renderTable }: DataPanelProps<T>) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(input);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const key: QueryKey = ["admin", queryKey, page, search];
  const query = useQuery<Page<T>, Error>({
    queryKey: key,
    queryFn: () => fetchPage(page, search),
    placeholderData: (prev) => prev,
    retry: false,
  });

  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="max-w-sm"
      />
      {query.isLoading ? (
        <AsyncStateCard loading title="Loading..." />
      ) : query.isError ? (
        <AsyncStateCard title="Could not load data" description={errorDescription(query.error)} onRetry={() => void query.refetch()} />
      ) : !query.data || query.data.rows.length === 0 ? (
        <AsyncStateCard variant="empty" title={emptyTitle} />
      ) : (
        <>
          <div className="glass-card overflow-x-auto">{renderTable(query.data.rows)}</div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page + 1} of {pages} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0 || query.isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages || query.isFetching} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DataPanel;

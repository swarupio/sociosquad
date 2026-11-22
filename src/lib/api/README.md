# API helpers

- Import the client: `import { supabase } from '@/lib/supabaseClient'` (re-export of the typed client; 15s request timeout).
- `run(query)` awaits a Supabase query and returns `{ data, error }` where `error` is an `AppError` with a user-friendly `message`. It never throws.
- `withRetry(() => query)` retries idempotent reads twice with backoff. Never use for inserts/updates/deletes. 4xx/RLS/auth errors are not retried.
- `normalizeError(e)` maps PostgREST, auth, network, abort and paused-project failures to `AppError` (`kind`, `status`, `code`).
- `isNetworkError(e)` is true for network/timeout/paused failures.

```ts
const { data, error } = await run(withRetry(() => supabase.from('opportunities').select('*')));
if (error) toast({ title: error.message, variant: 'destructive' });
```

Inside React Query, throw `error` from `queryFn`; the QueryClient default retry skips 4xx errors.

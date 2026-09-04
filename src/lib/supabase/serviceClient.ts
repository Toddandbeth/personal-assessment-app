import "server-only";
import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Bypasses RLS and every table grant entirely — this is what
// makes the admin gate a real security boundary rather than a client-side
// speed bump. Never import this file from a Client Component; every caller
// must itself re-check the admin session cookie (see src/lib/admin/session.ts)
// before using it.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

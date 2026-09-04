import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// No participant accounts and no admin auth yet (Phase One, session 1), so
// there's no cookie-based session to manage — a plain browser client is
// enough. If admin login is added later, switch to @supabase/ssr's
// createBrowserClient (see the sibling Accountability APP's
// lib/supabase/client.ts for that pattern).
let client: SupabaseClient | undefined;

export function createClient() {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

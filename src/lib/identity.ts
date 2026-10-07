import { createClient } from "@/lib/supabase/client";
import type { Door } from "@/lib/doors";
import {
  RPC,
  type FindReturningResult,
  type IdentityCheckResult,
  type StandaloneCategory,
  type Track,
} from "@/lib/supabase/types";

export interface IdentityArgs {
  track: Track;
  region: string | null;
  groupNumber: string | null;
  standaloneCategory: StandaloneCategory | null;
  firstName: string;
  lastFour: string;
  // Which front door this person came through. The Intentional Ministries
  // door also carries the person's 4-digit PIN (kept in memory only; it goes
  // to the database function and nowhere else — never into a URL, PDF or email).
  door: Door;
  pin: string | null;
}

export function toRpcArgs(args: IdentityArgs) {
  return {
    p_track: args.track,
    p_region: args.region,
    p_group_number: args.groupNumber,
    p_standalone_category: args.standaloneCategory,
    p_first_name: args.firstName,
    p_last_four: args.lastFour,
    p_door: args.door,
    p_pin: args.pin,
  };
}

export async function checkIdentity(
  args: IdentityArgs
): Promise<IdentityCheckResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(RPC.checkIdentity, toRpcArgs(args));
  if (error) throw error;
  return data as IdentityCheckResult;
}

export async function archiveAndRestart(
  args: IdentityArgs
): Promise<IdentityCheckResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    RPC.archiveAndRestart,
    toRpcArgs(args)
  );
  if (error) throw error;
  return data as IdentityCheckResult;
}

// "I'm returning" — looks up a participant by first name + last four only.
// Never returns a raw participant/group id (see security model note in
// supabase/migrations/0001_init.sql) — only the same Region/Group/category
// fields the normal entry form already collects, so the caller can
// immediately reconstruct IdentityArgs and re-verify via checkIdentity
// exactly as if the person had typed those fields in themselves.
export async function findReturning(
  firstName: string,
  lastFour: string
): Promise<FindReturningResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(RPC.findReturning, {
    p_first_name: firstName,
    p_last_four: lastFour,
  });
  if (error) throw error;
  return data as FindReturningResult;
}

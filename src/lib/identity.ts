import { createClient } from "@/lib/supabase/client";
import {
  RPC,
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
}

export function toRpcArgs(args: IdentityArgs) {
  return {
    p_track: args.track,
    p_region: args.region,
    p_group_number: args.groupNumber,
    p_standalone_category: args.standaloneCategory,
    p_first_name: args.firstName,
    p_last_four: args.lastFour,
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

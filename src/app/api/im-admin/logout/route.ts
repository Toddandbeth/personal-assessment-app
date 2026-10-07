import { handleAdminLogout } from "@/lib/admin/login";

export async function POST() {
  return handleAdminLogout("intentionalministries");
}

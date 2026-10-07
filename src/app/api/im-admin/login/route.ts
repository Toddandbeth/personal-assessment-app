import { handleAdminLogin } from "@/lib/admin/login";

export async function POST(request: Request) {
  return handleAdminLogin("intentionalministries", request);
}

import { isAdminRequest } from "@/lib/admin/session";
import AdminGate from "@/components/admin/AdminGate";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const authorized = await isAdminRequest();

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-lg">
        {authorized ? <AdminDashboard /> : <AdminGate />}
      </div>
    </div>
  );
}

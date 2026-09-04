import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/session";
import RegionReportView from "@/components/admin/RegionReportView";

export default async function RegionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminRequest())) {
    redirect("/admin");
  }

  const { id } = await params;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-lg">
        <RegionReportView regionId={id} />
      </div>
    </div>
  );
}

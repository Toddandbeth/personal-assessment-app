import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/session";
import GeneralReportView from "@/components/admin/GeneralReportView";

export default async function GeneralReportPage({
  params,
}: {
  params: Promise<{ categoryId: string; year: string }>;
}) {
  if (!(await isAdminRequest())) {
    redirect("/fullcount/admin");
  }

  const { categoryId, year } = await params;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-lg">
        <GeneralReportView categoryId={categoryId} year={Number(year)} />
      </div>
    </div>
  );
}

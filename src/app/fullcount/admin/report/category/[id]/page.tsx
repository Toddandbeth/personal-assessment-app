import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/session";
import CategoryReportView from "@/components/admin/CategoryReportView";

export default async function CategoryReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminRequest("fullcount"))) {
    redirect("/fullcount/admin");
  }

  const { id } = await params;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-lg">
        <CategoryReportView categoryId={id} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/session";
import AdminGate from "@/components/admin/AdminGate";
import ImAdminDashboard from "@/components/im/ImAdminDashboard";

// The Intentional Ministries admin lives at an unguessable address that is
// stored only in the IM_ADMIN_PATH environment variable. Any other address
// is a plain "not found". It is linked from nowhere, kept out of
// robots.txt (listing it there would reveal it), and marked noindex.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function HiddenImAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const secret = process.env.IM_ADMIN_PATH?.trim();
  if (!secret || slug !== secret) notFound();

  const authorized = await isAdminRequest("intentionalministries");

  return (
    <div className="flex flex-1 flex-col bg-mist px-4 py-8 sm:px-6 sm:py-12">
      <div className="im-card mx-auto w-full max-w-3xl overflow-hidden border border-gray bg-white">
        <div className="h-1.5 bg-blue" aria-hidden />
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          {authorized ? <ImAdminDashboard /> : <AdminGate loginEndpoint="/api/im-admin/login" />}
        </div>
      </div>
    </div>
  );
}

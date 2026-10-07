import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { parseDoor } from "@/lib/doors";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { renderPdf } from "@/lib/pdf/render";
import type { ReportUnit } from "@/lib/admin/report";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // The caller names its door; that door's own admin login must be valid.
  // (A Full Count login never authorizes an Intentional Ministries request,
  // or the reverse.)
  if (!(await isAdminRequest(parseDoor(body?.door)))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const units = body?.units as ReportUnit[] | undefined;

  if (!Array.isArray(units) || units.length === 0) {
    return NextResponse.json({ error: "No report to export." }, { status: 400 });
  }

  const document = <ReportDocument units={units} />;
  try {
    const buffer = await renderPdf(document);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="personal-assessment-report.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import ComparisonDocument from "@/lib/pdf/ComparisonDocument";
import { renderPdf } from "@/lib/pdf/render";
import type { ComparisonRow } from "@/lib/supabase/types";

// Participant-facing, unauthenticated — same trust model as the rest of
// the participant flow (no accounts). Renders whatever comparison rows
// the client already legitimately fetched via da_get_comparison; this
// route never queries the database itself.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rows = body?.rows as ComparisonRow[] | undefined;
  const firstName = typeof body?.firstName === "string" ? body.firstName : "";

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No results to export." }, { status: 400 });
  }

  const document = <ComparisonDocument rows={rows} firstName={firstName} />;
  try {
    const buffer = await renderPdf(document);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="personal-assessment-results.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}

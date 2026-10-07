import DeliveryControls from "@/components/DeliveryControls";
import ReportUnitCard from "@/components/admin/ReportUnitCard";
import type { ReportUnit } from "@/lib/admin/report";
import type { Door } from "@/lib/doors";

export default function ReportView({
  units,
  payload,
  door = "fullcount",
}: {
  units: ReportUnit[];
  door?: Door;
  // Defaults to the already-loaded units. Region reports pass a function
  // instead so Download/Email can fetch the complete per-group bundle
  // without slowing down the initial on-screen (combined-only) view.
  payload?: Record<string, unknown> | (() => Promise<Record<string, unknown>>);
}) {
  return (
    <div className="flex flex-col gap-8">
      <DeliveryControls
        pdfEndpoint="/api/admin/report/pdf"
        emailEndpoint="/api/admin/report/email"
        payload={payload ?? { units, door }}
        downloadFilename="personal-assessment-report.pdf"
        emailButtonLabel="Email to myself"
      />

      {units.map((unit, i) => (
        <ReportUnitCard key={i} unit={unit} />
      ))}
    </div>
  );
}

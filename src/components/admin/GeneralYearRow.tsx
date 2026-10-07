import Link from "next/link";

export default function GeneralYearRow({
  categoryId,
  year,
}: {
  categoryId: string;
  year: number;
}) {
  return (
    <div className="border-t border-[#ccd0d6] pt-2">
      <Link
        href={`/fullcount/admin/report/general/${categoryId}/${year}`}
        className="text-sm font-medium text-[#253551] hover:underline"
      >
        General {year}
      </Link>
    </div>
  );
}

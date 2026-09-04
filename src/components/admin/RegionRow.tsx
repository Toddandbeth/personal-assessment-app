import Link from "next/link";
import AddGroupsControl from "@/components/admin/AddGroupsControl";

export default function RegionRow({
  region,
  onGroupAdded,
}: {
  region: { id: string; name: string; groupCount: number };
  onGroupAdded: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ccd0d6] pt-2">
      <Link
        href={`/admin/report/region/${region.id}`}
        className="text-sm font-medium text-[#253551] hover:underline"
      >
        {region.name}
        <span className="font-normal text-zinc-400">
          {" "}
          — {region.groupCount} group{region.groupCount === 1 ? "" : "s"}
        </span>
      </Link>
      <AddGroupsControl regionId={region.id} onAdded={onGroupAdded} />
    </div>
  );
}

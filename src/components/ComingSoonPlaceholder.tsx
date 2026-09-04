import Link from "next/link";

export default function ComingSoonPlaceholder({
  heading,
  message,
  note = "This isn't built yet.",
}: {
  heading: string;
  message: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">{heading}</h1>
      <p className="max-w-sm text-zinc-600">{message}</p>
      <p className="text-sm text-zinc-500">{note}</p>
      <Link
        href="/"
        className="mt-2 rounded-full border border-[#ccd0d6] px-5 py-2 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
      >
        Return to home screen
      </Link>
    </div>
  );
}

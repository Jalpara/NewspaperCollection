import { cn } from "@/lib/utils";

const styles = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700",
  partial: "border-sky-200 bg-sky-50 text-sky-700",
  recorded: "border-slate-200 bg-slate-100 text-slate-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-orange-200 bg-orange-50 text-orange-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

export function StatusBadge({ status }: { status: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

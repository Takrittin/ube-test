import type { AIRecommendation } from "@/lib/types";

export function StatusBadge({ value }: { value: AIRecommendation }) {
  const styles = {
    Pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Fail: "border-rose-200 bg-rose-50 text-rose-700",
    "Manual Review": "border-amber-200 bg-amber-50 text-amber-800",
  }[value];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${styles}`}
    >
      {value}
    </span>
  );
}

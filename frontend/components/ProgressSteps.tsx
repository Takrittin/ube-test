import { Check } from "lucide-react";

const steps = ["Identify lot", "Upload image", "AI analysis", "Confirm", "Complete"];

export function ProgressSteps({ current }: { current: number }) {
  return (
    <nav aria-label="Inspection progress" className="overflow-x-auto pb-2">
      <ol className="flex min-w-[560px] items-center">
        {steps.map((step, index) => {
          const number = index + 1;
          const complete = number < current;
          const active = number === current;
          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2.5">
                <span
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold",
                    complete
                      ? "bg-ube-700 text-white"
                      : active
                        ? "border-2 border-ube-600 bg-ube-50 text-ube-700"
                        : "border border-black/10 bg-white text-muted",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {complete ? <Check size={15} aria-hidden="true" /> : number}
                </span>
                <span
                  className={`whitespace-nowrap text-xs font-bold ${
                    active || complete ? "text-ink" : "text-muted"
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={`mx-3 h-px flex-1 ${
                    complete ? "bg-ube-400" : "bg-black/10"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


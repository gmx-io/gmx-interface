import cx from "classnames";

type StepProgressProps = {
  steps?: number;
  currentStep?: number;
};

export function StepProgress({ steps = 3, currentStep = 0 }: StepProgressProps) {
  return (
    <div className="flex w-full gap-8">
      {Array.from({ length: steps }).map((_, i) => (
        <div key={i} className={cx("h-2 flex-1 rounded-full", i <= currentStep ? "bg-blue-300" : "bg-slate-700")} />
      ))}
    </div>
  );
}

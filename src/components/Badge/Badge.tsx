import cx from "classnames";

type Props = {
  value: number;
  indicator?: BadgeIndicator;
};

export type BadgeIndicator = "error" | "warning";

export default function Badge({ value, indicator }: Props) {
  return (
    <div className="text-body-small relative min-w-20 rounded-full bg-slate-700 px-6 py-2 font-medium text-typography-secondary">
      {value}
      {indicator ? (
        <div
          className={cx("absolute -right-1 -top-1 h-6 w-6 rounded-full", {
            "bg-red-500": indicator === "error",
            "bg-yellow-300": indicator === "warning",
          })}
        />
      ) : null}
    </div>
  );
}

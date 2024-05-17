import { ReactNode, useMemo } from "react";
import cx from "classnames";
import "./StatsTooltip.css";

export type StatsTooltipRowProps = {
  textClassName?: string;
  label: string | ReactNode;
  value: number | string | string[] | number[] | ReactNode;
  showDollar?: boolean;
  unit?: string;
  showColon?: boolean;
};

export default function StatsTooltipRow({
  label,
  value,
  textClassName,
  showDollar = true,
  unit,
  showColon = true,
}: StatsTooltipRowProps) {
  const valueClassName = useMemo(() => textClassName ?? "text-white", [textClassName]);

  function renderValue() {
    if (Array.isArray(value)) {
      return (
        <ul className="Tooltip-row-values text-white">
          {value.map((v, i) => (
            <li className={valueClassName} key={i}>
              {v}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <span className={cx("Tooltip-row-value", valueClassName)}>
        {showDollar && "$"}
        {value}
        {unit || ""}
      </span>
    );
  }

  function renderLabel() {
    if (typeof label === "string") {
      return showColon ? `${label}:` : label;
    }

    return label;
  }

  return (
    <div className={cx("Tooltip-row", textClassName)}>
      <span className="Tooltip-row-label text-gray-300">{renderLabel()}</span>
      {renderValue()}
    </div>
  );
}

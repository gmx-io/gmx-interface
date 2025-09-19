import cx from "classnames";
import { ReactNode } from "react";
import "./StatsTooltip.css";

export type StatsTooltipRowProps = {
  textClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  label: string | ReactNode;
  value: number | string | string[] | number[] | ReactNode;
  showDollar?: boolean;
  unit?: string;
  showColon?: boolean;
};

export default function StatsTooltipRow({
  label,
  value,
  textClassName = "text-typography-primary",
  labelClassName = "text-typography-secondary",
  valueClassName,
  showDollar = true,
  unit,
  showColon = true,
}: StatsTooltipRowProps) {
  function renderValue() {
    if (Array.isArray(value)) {
      return (
        <ul className="Tooltip-row-values text-typography-primary">
          {value.map((v, i) => (
            <li className={cx(textClassName, valueClassName)} key={i}>
              {v}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <span className={cx("Tooltip-row-value", textClassName, valueClassName)}>
        {showDollar && "$\u200a\u200d"}
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
      <span className={cx("Tooltip-row-label", labelClassName)}>{renderLabel()}</span>
      {renderValue()}
    </div>
  );
}

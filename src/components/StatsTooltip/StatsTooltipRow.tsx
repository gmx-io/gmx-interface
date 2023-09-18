import { ReactNode } from "react";
import cx from "classnames";
import "./StatsTooltip.css";

type Props = {
  className?: string;
  label: string | ReactNode;
  value: number | string | string[] | number[] | ReactNode;
  showDollar?: boolean;
  showColon?: boolean;
};

export default function StatsTooltipRow({ label, value, className, showDollar = true }: Props) {
  function renderValue() {
    if (Array.isArray(value)) {
      return (
        <ul className="Tooltip-row-values text-white">
          {value.map((v, i) => (
            <li className={className} key={i}>
              {v}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <span className={cx("Tooltip-row-value text-white", className)}>
        {showDollar && "$"}
        {value}
      </span>
    );
  }

  function renderLabel() {
    if (typeof label === "string") {
      return `${label}:`;
    }

    return label;
  }

  return (
    <div className={cx("Tooltip-row", className)}>
      <span className="Tooltip-row-label text-gray">{renderLabel()}</span>
      {renderValue()}
    </div>
  );
}

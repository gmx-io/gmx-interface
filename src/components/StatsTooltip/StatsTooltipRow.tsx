import "./StatsTooltip.css";
import cx from "classnames";

type Props = {
  label: string;
  value: number | string | string[] | number[];
  showDollar?: boolean;
  className?: string;
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
  return (
    <div className="Tooltip-row">
      <span className="Tooltip-row-label text-gray">{label}:</span>
      {renderValue()}
    </div>
  );
}

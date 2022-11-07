import "./StatsTooltip.css";
type Props = {
  label: string;
  value: number | string | string[] | number[];
  showDollar?: boolean;
};

export default function StatsTooltipRow({ label, value, showDollar = true }: Props) {
  function renderValue() {
    if (Array.isArray(value)) {
      return (
        <ul className="Tooltip-row-values">
          {value.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      );
    }
    return (
      <span className="Tooltip-row-value">
        {showDollar && "$"}
        {value}
      </span>
    );
  }
  return (
    <div className="Tooltip-row">
      <span className="label">{label}:</span>
      {renderValue()}
    </div>
  );
}

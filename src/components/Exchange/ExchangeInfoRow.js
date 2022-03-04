import cx from "classnames";

export default function ExchangeInfoRow(props) {
  const { label, children, value, isTop, isWarning } = props;

  return (
    <div className={cx("Exchange-info-row", { "top-line": isTop })}>
      <div className="Exchange-info-label">{label}</div>
      <div className={`align-right ${isWarning ? "Exchange-info-value-warning" : ""}`}>{children || value}</div>
    </div>
  );
}

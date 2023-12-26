import cx from "classnames";

export default function ExchangeInfoRow(props) {
  const { label, children, value, isTop, isWarning, className } = props;

  return (
    <div className={cx("Exchange-info-row", className, { "top-line": isTop })}>
      <div className="Exchange-info-label">{label}</div>
      <div className={cx({ "Exchange-info-value-warning": isWarning })}>{children || value}</div>
    </div>
  );
}

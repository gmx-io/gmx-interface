import cx from "classnames";
import React, { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  label: React.ReactNode;
  value?: React.ReactNode;
  isTop?: boolean;
  isWarning?: boolean;
  className?: string;
  onClick?: () => void;
}>;

export default function ExchangeInfoRow(props: Props) {
  const { label, children, value, isTop, isWarning, className, onClick } = props;

  return (
    <div
      className={cx("Exchange-info-row", className, { "top-line": isTop, "cursor-pointer": onClick })}
      onClick={onClick}
    >
      <div className="Exchange-info-label">{label}</div>
      <div className={cx("Exchange-info-value", { "Exchange-info-value-warning": isWarning })}>{children || value}</div>
    </div>
  );
}

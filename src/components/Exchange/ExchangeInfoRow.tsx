import cx from "classnames";
import React, { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  label: React.ReactNode;
  value?: React.ReactNode;
  isTop?: boolean;
  isWarning?: boolean;
  className?: string;
  qa?: string;
}>;

export default function ExchangeInfoRow(props: Props) {
  const { label, children, value, isTop, isWarning, className, qa } = props;

  return (
    <div className={cx("Exchange-info-row", className, { "top-line": isTop })} data-qa={`info-row-${qa}`}>
      <div className="Exchange-info-label" data-qa={`info-row-${qa}-label`}>
        {label}
      </div>
      <div
        className={cx("Exchange-info-value", { "Exchange-info-value-warning": isWarning })}
        data-qa={`info-row-${qa}-value`}
      >
        {children || value}
      </div>
    </div>
  );
}

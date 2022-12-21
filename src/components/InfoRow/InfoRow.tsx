import { ReactNode } from "react";
import cx from "classnames";

type Props = {
  className?: string;
  label: ReactNode;
  value: ReactNode;
};

export function InfoRow(p: Props) {
  return (
    <div className={cx("Exchange-info-row", p.className)}>
      <div className="Exchange-info-label">{p.label}</div>
      <div className="align-right">{p.value}</div>
    </div>
  );
}

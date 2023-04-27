import { ReactNode } from "react";
import cx from "classnames";
import Tooltip from "../Tooltip/Tooltip";

type Props = {
  label?: ReactNode;
  data?: ReactNode;
  tooltipText?: ReactNode;
  toolTipPosition?: string;
  className?: string;
};

function InfoCard({ label, data, tooltipText, toolTipPosition = "left-bottom", className }: Props) {
  return (
    <div className={cx("info-card", className)}>
      <div className="card-details">
        <h3 className="info-card-label">
          {tooltipText ? (
            <Tooltip handle={label} position={toolTipPosition} renderContent={() => tooltipText} />
          ) : (
            label
          )}
        </h3>
        <div className="info-card-data">{data}</div>
      </div>
    </div>
  );
}

export default InfoCard;

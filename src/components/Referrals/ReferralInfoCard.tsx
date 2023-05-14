import Tooltip from "../Tooltip/Tooltip";
import { ReactNode } from "react";

type Props = {
  label: string;
  value: string;
  labelTooltipText?: string;
  tooltipPosition?: string;
  tooltipContent?: ReactNode;
  children?: ReactNode;
};

function ReferralInfoCard({
  value,
  label,
  labelTooltipText,
  children,
  tooltipContent,
  tooltipPosition = "left-bottom",
}: Props) {
  return (
    <div className="info-card">
      <div className="card-details">
        <h3 className="card-label">
          {labelTooltipText ? (
            <Tooltip handle={label} position={tooltipPosition} renderContent={() => labelTooltipText} />
          ) : (
            label
          )}
        </h3>
        <div className="card-data">
          {tooltipContent && (
            <Tooltip position="center-bottom" className="nowrap" handle={value} renderContent={() => tooltipContent} />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default ReferralInfoCard;

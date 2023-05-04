import Tooltip from "../Tooltip/Tooltip";
import { getUSDValue } from "./referralsHelper";
import { useChainId } from "lib/chains";
import { ReactNode } from "react";

type Props = {
  label: string;
  labelTooltipText: string;
  data: any;
  dataKeys: Array<string>;
  totalDataKey: string;
  showDollar?: boolean;
  shouldFormat?: boolean;
  tooltipPosition?: string;
  children?: ReactNode;
  tooltipContent?: ReactNode;
};

function ReferralInfoCard({
  label,
  data,
  dataKeys = [],
  shouldFormat = true,
  labelTooltipText,
  tooltipPosition = "left-bottom",
  children,
  tooltipContent,
}: Props) {
  const [parentKey, childKey] = dataKeys;
  const { chainId } = useChainId();
  const currentChainData = data?.[chainId];

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
          {data && (
            <Tooltip
              position="center-bottom"
              className="nowrap"
              handle={
                shouldFormat
                  ? getUSDValue(currentChainData?.[parentKey]?.[childKey])
                  : currentChainData?.[parentKey]?.[childKey] || "0"
              }
              renderContent={() => tooltipContent}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default ReferralInfoCard;

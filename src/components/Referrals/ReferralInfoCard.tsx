import { ARBITRUM, AVALANCHE } from "config/chains";
import Tooltip from "../Tooltip/Tooltip";
import StatsTooltip from "components/StatsTooltip/StatsTooltip";
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
};

function ReferralInfoCard({
  label,
  data,
  dataKeys = [],
  totalDataKey,
  showDollar = true,
  shouldFormat = true,
  labelTooltipText,
  tooltipPosition = "left-bottom",
  children,
}: Props) {
  const [parentKey, childKey] = dataKeys;
  const { chainId } = useChainId();
  const arbitrumData = data?.[ARBITRUM];
  const avaxData = data?.[AVALANCHE];
  const totalData = data?.total;
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
              renderContent={() => (
                <StatsTooltip
                  title={label}
                  showDollar={showDollar}
                  shouldFormat={shouldFormat}
                  arbitrumValue={arbitrumData?.[parentKey]?.[childKey] || "0"}
                  avaxValue={avaxData?.[parentKey]?.[childKey] || "0"}
                  total={totalData?.[totalDataKey || childKey] || "0"}
                />
              )}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default ReferralInfoCard;

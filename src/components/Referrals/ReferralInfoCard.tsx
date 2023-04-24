import { ARBITRUM, AVALANCHE } from "config/chains";
import Tooltip from "../Tooltip/Tooltip";
import StatsTooltip from "components/StatsTooltip/StatsTooltip";
import { getUSDValue } from "./referralsHelper";
import { useChainId } from "lib/chains";

function ReferralInfoCard({
  label,
  data,
  tooltipText,
  dataKeys = [],
  totalDataKey,
  showDollar = true,
  shouldFormat = true,
  toolTipPosition = "left-bottom",
  children,
}) {
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
          {tooltipText ? (
            <Tooltip handle={label} position={toolTipPosition} renderContent={() => tooltipText} />
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

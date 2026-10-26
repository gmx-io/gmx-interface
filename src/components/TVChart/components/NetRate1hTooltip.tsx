import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import MarketNetFee from "components/MarketNetFee/MarketNetFee";
import { TooltipContent, TooltipDivider } from "components/Tooltip/TooltipBlocks";

export function NetRate1hTooltip() {
  const info = useSelector(selectChartHeaderInfo);

  if (info?.fundingRateLong === undefined || info?.fundingRateShort === undefined) return null;

  return (
    <TooltipContent>
      <MarketNetFee
        borrowRateHourly={info?.borrowingRateLong}
        fundingRateHourly={info?.fundingRateLong}
        isLong={true}
      />
      <TooltipDivider />
      <MarketNetFee
        borrowRateHourly={info?.borrowingRateShort}
        fundingRateHourly={info?.fundingRateShort}
        isLong={false}
      />
    </TooltipContent>
  );
}

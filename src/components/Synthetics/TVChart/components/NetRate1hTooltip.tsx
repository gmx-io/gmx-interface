import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import MarketNetFee from "components/Synthetics/MarketNetFee/MarketNetFee";

export function NetRate1hTooltip() {
  const info = useSelector(selectChartHeaderInfo);

  if (info?.fundingRateLong === undefined || info?.fundingRateShort === undefined) return null;

  return (
    <div>
      <MarketNetFee
        borrowRateHourly={info?.borrowingRateLong}
        fundingRateHourly={info?.fundingRateLong}
        isLong={true}
      />
      <br />
      <MarketNetFee
        borrowRateHourly={info?.borrowingRateShort}
        fundingRateHourly={info?.fundingRateShort}
        isLong={false}
      />
    </div>
  );
}

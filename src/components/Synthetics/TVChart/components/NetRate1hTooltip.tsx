import MarketNetFee from "components/Synthetics/MarketNetFee/MarketNetFee";

import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";

export function NetRate1hTooltip({
  isLong,
  info,
}: {
  isLong: boolean;
  info?: ReturnType<typeof selectChartHeaderInfo>;
}) {
  if (info?.fundingRateLong === undefined || info?.fundingRateShort === undefined) return [];

  const long = (
    <MarketNetFee borrowRateHourly={info?.borrowingRateLong} fundingRateHourly={info?.fundingRateLong} isLong={true} />
  );

  const short = (
    <MarketNetFee
      borrowRateHourly={info?.borrowingRateShort}
      fundingRateHourly={info?.fundingRateShort}
      isLong={false}
    />
  );

  const [currentFeeElement, oppositeFeeElement] = isLong ? [long, short] : [short, long];

  return (
    <div>
      {currentFeeElement}
      <br />
      {oppositeFeeElement}
    </div>
  );
}

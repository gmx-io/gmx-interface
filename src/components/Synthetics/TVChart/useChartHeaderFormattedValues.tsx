import { useMemo } from "react";

import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmountHuman, formatPercentageDisplay, formatRatePercentage } from "lib/numbers";

import { use24hVolume } from "domain/synthetics/tokens/use24Volume";

export function useChartHeaderFormattedValues() {
  const dailyVolumeValue = use24hVolume();
  const info = useSelector(selectChartHeaderInfo);

  const longOIValue = useMemo(() => {
    if (info?.longOpenInterestPercentage !== undefined && info.openInterestLong !== undefined) {
      return (
        <span className="whitespace-nowrap">
          {formatAmountHuman(info?.openInterestLong, USD_DECIMALS)} (
          {formatPercentageDisplay(info.longOpenInterestPercentage)})
        </span>
      );
    }

    return "-";
  }, [info?.longOpenInterestPercentage, info?.openInterestLong]);

  const shortOIValue = useMemo(() => {
    if (info?.longOpenInterestPercentage !== undefined && info.openInterestShort !== undefined) {
      return (
        <span className="whitespace-nowrap">
          {formatAmountHuman(info?.openInterestShort, USD_DECIMALS)} (
          {formatPercentageDisplay(100 - info.longOpenInterestPercentage)})
        </span>
      );
    }

    return "-";
  }, [info?.longOpenInterestPercentage, info?.openInterestShort]);

  const liquidityLong = info?.liquidityLong ? formatAmountHuman(info?.liquidityLong, USD_DECIMALS) : "-";
  const liquidityShort = info?.liquidityShort ? formatAmountHuman(info?.liquidityShort, USD_DECIMALS) : "-";

  const netRateLong = info?.netRateHourlyLong ? formatRatePercentage(info?.netRateHourlyLong) : "-";
  const netRateShort = info?.netRateHourlyShort ? formatRatePercentage(info?.netRateHourlyShort) : "-";

  const dailyVolume = dailyVolumeValue ? formatAmountHuman(dailyVolumeValue, USD_DECIMALS) : "-";

  return {
    longOIValue,
    shortOIValue,
    liquidityLong,
    liquidityShort,
    netRateLong,
    netRateShort,
    dailyVolume,
  };
}

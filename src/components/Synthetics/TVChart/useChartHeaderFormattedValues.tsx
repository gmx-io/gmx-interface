import cx from "classnames";
import { useMemo } from "react";

import { selectChartHeaderInfo, selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import {
  formatAmountHuman,
  formatPercentageDisplay,
  formatRatePercentage,
  formatUsd,
  numberWithCommas,
} from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { use24hPriceDelta } from "domain/synthetics/tokens";
import { use24hVolume } from "domain/synthetics/tokens/use24Volume";

import { AvailableLiquidityTooltip } from "./components/AvailableLiquidityTooltip";
import { NetRate1hTooltip } from "./components/NetRate1hTooltip";

import { getToken } from "config/tokens";

import { ReactComponent as LongIcon } from "img/long.svg";
import { ReactComponent as ShortIcon } from "img/short.svg";

export function useChartHeaderFormattedValues() {
  const dailyVolumeValue = use24hVolume();
  const info = useSelector(selectChartHeaderInfo);

  const chartToken = useSelector(selectChartToken);

  const { chainId } = useChainId();
  const chartTokenAddress = chartToken?.address;

  const oraclePriceDecimals = useSelector(selectSelectedMarketPriceDecimals);

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;

  const priceTokenSymbol = useMemo(() => {
    if (selectedTokenOption?.isWrapped) {
      return selectedTokenOption.baseSymbol;
    }

    return selectedTokenOption?.symbol;
  }, [selectedTokenOption]);

  const dayPriceDeltaData = use24hPriceDelta(chainId, priceTokenSymbol);

  const avgPriceValue = bigMath.avg(chartToken?.prices?.maxPrice, chartToken?.prices?.minPrice);

  const high24 = useMemo(
    () => (dayPriceDeltaData?.high ? numberWithCommas(dayPriceDeltaData.high.toFixed(oraclePriceDecimals)) : "-"),
    [dayPriceDeltaData, oraclePriceDecimals]
  );
  const low24 = useMemo(
    () => (dayPriceDeltaData?.low ? numberWithCommas(dayPriceDeltaData?.low.toFixed(oraclePriceDecimals)) : "-"),
    [dayPriceDeltaData, oraclePriceDecimals]
  );

  const dayPriceDelta = useMemo(() => {
    return (
      <div
        className={cx({
          positive: dayPriceDeltaData?.deltaPercentage && dayPriceDeltaData?.deltaPercentage > 0,
          negative: dayPriceDeltaData?.deltaPercentage && dayPriceDeltaData?.deltaPercentage < 0,
        })}
      >
        {dayPriceDeltaData?.deltaPercentageStr || "-"}
      </div>
    );
  }, [dayPriceDeltaData]);

  const avgPrice = useMemo(() => {
    return (
      formatUsd(avgPriceValue, {
        displayDecimals: oraclePriceDecimals,
      }) || "..."
    );
  }, [avgPriceValue, oraclePriceDecimals]);

  const [longOIValue, longOIPercentage] = useMemo(() => {
    if (info?.longOpenInterestPercentage !== undefined && info.openInterestLong !== undefined) {
      return [
        <>
          <LongIcon className="opacity-70" />
          <span key="long-oi-value" className="whitespace-nowrap">
            ${formatAmountHuman(info?.openInterestLong, USD_DECIMALS)}
          </span>
        </>,
        formatPercentageDisplay(info.longOpenInterestPercentage),
      ];
    }

    return ["...", null];
  }, [info?.longOpenInterestPercentage, info?.openInterestLong]);

  const [shortOIValue, shortOIPercentage] = useMemo(() => {
    if (info?.shortOpenInterestPercentage !== undefined && info.openInterestShort !== undefined) {
      return [
        <>
          <ShortIcon className="opacity-70" />
          <span key="short-oi-value" className="whitespace-nowrap">
            ${formatAmountHuman(info?.openInterestShort, USD_DECIMALS)}
          </span>
        </>,
        formatPercentageDisplay(info.shortOpenInterestPercentage),
      ];
    }

    return ["...", null];
  }, [info?.shortOpenInterestPercentage, info?.openInterestShort]);

  const liquidityLong = useMemo(() => {
    const liquidity = info?.liquidityLong;

    if (liquidity === undefined) {
      return "...";
    }

    return (
      <TooltipWithPortal
        disableHandleStyle
        handle={
          <span className="flex items-center justify-center gap-4">
            <LongIcon className="opacity-70" />${formatAmountHuman(liquidity, USD_DECIMALS)}
          </span>
        }
        position="bottom-end"
        content={<AvailableLiquidityTooltip isLong />}
      />
    );
  }, [info?.liquidityLong]);

  const liquidityShort = useMemo(() => {
    const liquidity = info?.liquidityShort;

    if (liquidity === undefined) {
      return "...";
    }

    return (
      <TooltipWithPortal
        disableHandleStyle
        handle={
          <span className="flex items-center justify-center gap-4">
            <ShortIcon className="opacity-70" />${formatAmountHuman(liquidity, USD_DECIMALS)}
          </span>
        }
        position="bottom-end"
        content={<AvailableLiquidityTooltip isLong={false} />}
      />
    );
  }, [info?.liquidityShort]);

  const netRateLong = useMemo(() => {
    const netRate = info?.netRateHourlyLong;

    if (netRate === undefined) {
      return "...";
    }

    return (
      <TooltipWithPortal
        disableHandleStyle
        handle={
          <span
            className={cx("flex flex-row items-center gap-4", {
              positive: netRate >= 0n,
              negative: netRate < 0n,
            })}
          >
            <LongIcon />
            {formatRatePercentage(netRate)}
          </span>
        }
        position="bottom-end"
        content={<NetRate1hTooltip isLong info={info} />}
      />
    );
  }, [info]);

  const netRateShort = useMemo(() => {
    const netRate = info?.netRateHourlyShort;

    if (netRate === undefined) {
      return "...";
    }

    return (
      <TooltipWithPortal
        disableHandleStyle
        handle={
          <span
            className={cx("flex flex-row items-center gap-4", {
              positive: netRate >= 0n,
              negative: netRate < 0n,
            })}
          >
            <ShortIcon />
            {formatRatePercentage(netRate)}
          </span>
        }
        position="bottom-end"
        content={<NetRate1hTooltip isLong={false} info={info} />}
      />
    );
  }, [info]);

  const dailyVolume = dailyVolumeValue !== undefined ? `$${formatAmountHuman(dailyVolumeValue, USD_DECIMALS)}` : "...";

  return {
    avgPrice,
    high24,
    low24,
    longOIValue,
    shortOIValue,
    longOIPercentage,
    shortOIPercentage,
    liquidityLong,
    liquidityShort,
    netRateLong,
    netRateShort,
    dailyVolume,
    dayPriceDelta,
    info,
  };
}

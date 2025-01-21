import cx from "classnames";
import { useMemo } from "react";
import type { Address } from "viem";

import { selectChartHeaderInfo, selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { USD_DECIMALS } from "config/factors";
import { getToken } from "sdk/configs/tokens";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { use24hPriceDeltaMap } from "domain/synthetics/tokens";
import { use24hVolumes } from "domain/synthetics/tokens/use24Volumes";
import { bigMath } from "sdk/utils/bigmath";
import {
  formatAmountHuman,
  formatPercentageDisplay,
  formatRatePercentage,
  formatUsdPrice,
  numberWithCommas,
} from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { AvailableLiquidityTooltip } from "./components/AvailableLiquidityTooltip";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";

export function useChartHeaderFormattedValues() {
  const chainId = useSelector(selectChainId);
  const info = useSelector(selectChartHeaderInfo);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);
  const { chartToken } = useSelector(selectChartToken);
  const chartTokenAddress = chartToken?.address as Address;
  const oraclePriceDecimals = useSelector(selectSelectedMarketPriceDecimals);
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;
  const visualMultiplier = isSwap ? 1 : selectedTokenOption?.visualMultiplier ?? 1;

  const priceTokenAddress = useMemo(() => {
    if (selectedTokenOption?.isWrapped) {
      return selectedTokenOption.address;
    }

    return selectedTokenOption?.address;
  }, [selectedTokenOption]);

  const dailyVolumes = use24hVolumes();
  const dailyVolumesValue = marketInfo?.marketTokenAddress
    ? dailyVolumes?.byMarketToken?.[marketInfo?.marketTokenAddress]
    : undefined;
  const dayPriceDeltaMap = use24hPriceDeltaMap(chainId, [priceTokenAddress as Address]);
  const dayPriceDeltaData = chartTokenAddress ? dayPriceDeltaMap?.[chartTokenAddress] : undefined;

  const avgPriceValue = bigMath.avg(chartToken?.prices?.maxPrice, chartToken?.prices?.minPrice);

  const high24 = useMemo(() => {
    if (!dayPriceDeltaData?.high) {
      return "-";
    }

    let value = dayPriceDeltaData.high;
    if (!isSwap) {
      value = value * visualMultiplier;
    }

    return numberWithCommas(value.toFixed(oraclePriceDecimals));
  }, [dayPriceDeltaData, oraclePriceDecimals, visualMultiplier, isSwap]);

  const low24 = useMemo(() => {
    if (!dayPriceDeltaData?.low) {
      return "-";
    }

    let value = dayPriceDeltaData.low;
    if (!isSwap) {
      value = value * visualMultiplier;
    }

    return numberWithCommas(value.toFixed(oraclePriceDecimals));
  }, [dayPriceDeltaData, oraclePriceDecimals, visualMultiplier, isSwap]);

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
      formatUsdPrice(avgPriceValue, {
        visualMultiplier,
      }) || "..."
    );
  }, [avgPriceValue, visualMultiplier]);

  const [longOIValue, longOIPercentage] = useMemo(() => {
    if (info?.longOpenInterestPercentage !== undefined && info.openInterestLong !== undefined) {
      return [
        <>
          <LongIcon width={12} className="relative top-1 opacity-70" />
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
          <ShortIcon width={12} className="relative opacity-70" />
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
            <LongIcon width={12} className="relative top-1 opacity-70" />${formatAmountHuman(liquidity, USD_DECIMALS)}
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
            <ShortIcon width={12} className="relative opacity-70" />${formatAmountHuman(liquidity, USD_DECIMALS)}
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
      <span
        className={cx("flex flex-row items-center gap-4", {
          positive: netRate >= 0n,
          negative: netRate < 0n,
        })}
      >
        <LongIcon width={12} className="relative top-1" />
        {formatRatePercentage(netRate)}
      </span>
    );
  }, [info]);

  const netRateShort = useMemo(() => {
    const netRate = info?.netRateHourlyShort;

    if (netRate === undefined) {
      return "...";
    }

    return (
      <span
        className={cx("flex flex-row items-center gap-4", {
          positive: netRate >= 0n,
          negative: netRate < 0n,
        })}
      >
        <ShortIcon width={12} />
        {formatRatePercentage(netRate)}
      </span>
    );
  }, [info]);

  const dailyVolume = useMemo(() => {
    return dailyVolumesValue !== undefined ? `$${formatAmountHuman(dailyVolumesValue, USD_DECIMALS)}` : "...";
  }, [dailyVolumesValue]);

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

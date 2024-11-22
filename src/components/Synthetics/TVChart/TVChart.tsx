import { t } from "@lingui/macro";
import { useEffect, useMemo } from "react";
import { useMedia } from "react-use";

import TVChartContainer, { ChartLine } from "components/TVChartContainer/TVChartContainer";
import { convertTokenAddress, getPriceDecimals, getTokenVisualMultiplier } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import {
  useOrdersInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSelectedMarketVisualMultiplier } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { isIncreaseOrderType, isSwapOrderType, PositionOrderInfo } from "domain/synthetics/orders";
import { getTokenData } from "domain/synthetics/tokens";

import { USD_DECIMALS } from "config/factors";
import { useChainId } from "lib/chains";
import { CHART_PERIODS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount } from "lib/numbers";

import { TVChartHeader } from "./TVChartHeader";

import "./TVChart.scss";

const DEFAULT_PERIOD = "5m";

export function TVChart() {
  const { chartToken, symbol: chartTokenSymbol } = useSelector(selectChartToken);
  const visualMultiplier = useSelector(selectSelectedMarketVisualMultiplier);
  const ordersInfo = useOrdersInfoData();
  const tokensData = useTokensData();
  const positionsInfo = usePositionsInfoData();

  const { chainId } = useChainId();
  const chartTokenAddress = chartToken?.address;

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period-v2"], DEFAULT_PERIOD);

  if (!period || !(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const chartLines = useMemo(() => {
    if (!chartTokenAddress) {
      return [];
    }

    const orderLines: ChartLine[] = Object.values(ordersInfo || {})
      .filter((order) => {
        if (isSwapOrderType(order.orderType)) {
          return false;
        }

        const positionOrder = order as PositionOrderInfo;

        return (
          positionOrder.marketInfo &&
          positionOrder.triggerPrice !== undefined &&
          convertTokenAddress(chainId, positionOrder.marketInfo.indexTokenAddress, "wrapped") ===
            convertTokenAddress(chainId, chartTokenAddress, "wrapped")
        );
      })
      .map((order) => {
        const positionOrder = order as PositionOrderInfo;
        const priceDecimal = getPriceDecimals(chainId, positionOrder.indexToken.symbol);

        const longOrShortText = order.isLong ? t`Long` : t`Short`;
        const orderTypeText = isIncreaseOrderType(order.orderType) ? t`Inc.` : t`Dec.`;
        const token = getTokenData(tokensData, positionOrder.marketInfo.indexTokenAddress, "native");
        const tokenSymbol = token?.symbol;
        const prefix = token ? getTokenVisualMultiplier(token) : "";
        const tokenVisualMultiplier = token?.visualMultiplier;

        return {
          title: `${longOrShortText} ${orderTypeText} ${prefix}${tokenSymbol}`,
          price: parseFloat(
            formatAmount(
              positionOrder.triggerPrice,
              USD_DECIMALS,
              priceDecimal,
              undefined,
              undefined,
              tokenVisualMultiplier
            )
          ),
        };
      });

    const positionLines = Object.values(positionsInfo || {}).reduce((acc, position) => {
      const priceDecimal = getPriceDecimals(chainId, position.indexToken.symbol);
      if (
        position.marketInfo &&
        convertTokenAddress(chainId, position.marketInfo.indexTokenAddress, "wrapped") ===
          convertTokenAddress(chainId, chartTokenAddress, "wrapped")
      ) {
        const longOrShortText = position.isLong ? t`Long` : t`Short`;
        const token = getTokenData(tokensData, position.marketInfo?.indexTokenAddress, "native");
        const tokenSymbol = token?.symbol;
        const prefix = token ? getTokenVisualMultiplier(token) : "";
        const tokenVisualMultiplier = token?.visualMultiplier;

        const liquidationPrice = formatAmount(
          position?.liquidationPrice,
          USD_DECIMALS,
          priceDecimal,
          undefined,
          undefined,
          tokenVisualMultiplier
        );

        acc.push({
          title: t`Open ${longOrShortText} ${prefix}${tokenSymbol}`,
          price: parseFloat(
            formatAmount(position.entryPrice, USD_DECIMALS, priceDecimal, undefined, undefined, tokenVisualMultiplier)
          ),
        });
        if (liquidationPrice && liquidationPrice !== "NA") {
          acc.push({
            title: t`Liq. ${longOrShortText} ${prefix}${tokenSymbol}`,
            price: parseFloat(liquidationPrice),
          });
        }
      }

      return acc;
    }, [] as ChartLine[]);

    return orderLines.concat(positionLines);
  }, [chainId, chartTokenAddress, ordersInfo, positionsInfo, tokensData]);

  useEffect(
    function updatePeriod() {
      if (!period || !(period in CHART_PERIODS)) {
        setPeriod(DEFAULT_PERIOD);
      }
    },
    [period, setPeriod]
  );

  const chartTokenProp = useMemo(
    () =>
      chartToken
        ? {
            symbol: chartToken.symbol,
            ...chartToken.prices,
          }
        : {
            symbol: chartTokenSymbol || "",
            minPrice: 0n,
            maxPrice: 0n,
          },
    [chartToken, chartTokenSymbol]
  );

  const isMobile = useMedia("(max-width: 700px)");

  return (
    <div className="ExchangeChart tv">
      <TVChartHeader isMobile={isMobile} />
      <div className="ExchangeChart-bottom App-box App-box-border overflow-hidden">
        {chartToken && (
          <TVChartContainer
            chartLines={chartLines}
            chartToken={chartTokenProp}
            chainId={chainId}
            period={period}
            setPeriod={setPeriod}
            supportedResolutions={SUPPORTED_RESOLUTIONS_V2}
            visualMultiplier={visualMultiplier}
          />
        )}
      </div>
    </div>
  );
}

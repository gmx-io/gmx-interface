import { USD_DECIMALS } from "config/factors";
import {
  selectChainId,
  selectOrdersInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { PositionOrderInfo, isIncreaseOrderType, isMarketOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { calculateDisplayDecimals, formatAmount } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { convertTokenAddress, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { getMarketIndexName } from "sdk/utils/markets";

import { ChartLineSizeData, DynamicChartLine } from "components/TVChartContainer/types";

import { selectChartToken } from ".";

export const selectChartDynamicLines = createSelector<DynamicChartLine[]>((q) => {
  const chainId = q(selectChainId);
  const { chartToken } = q(selectChartToken);
  const ordersInfo = q(selectOrdersInfoData);

  const chartTokenAddress = chartToken?.address;

  if (!chartTokenAddress) {
    return EMPTY_ARRAY;
  }

  const orderLines: DynamicChartLine[] = Object.values(ordersInfo || {})
    .filter((order) => {
      if (isSwapOrderType(order.orderType) || isMarketOrderType(order.orderType)) {
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
      const tokenVisualMultiplier = q(
        (state) =>
          getTokenData(selectTokensData(state), positionOrder.marketInfo.indexTokenAddress, "native")?.visualMultiplier
      );

      const priceDecimal = calculateDisplayDecimals(positionOrder.triggerPrice, USD_DECIMALS, tokenVisualMultiplier);

      const sizeData: ChartLineSizeData | undefined = isIncreaseOrderType(positionOrder.orderType)
        ? {
            sizeInUsd: positionOrder.sizeDeltaUsd,
            sizeInTokens:
              (convertToTokenAmount(
                positionOrder.sizeDeltaUsd,
                positionOrder.indexToken.decimals,
                positionOrder.triggerPrice
              ) ?? 0n) / BigInt(tokenVisualMultiplier ?? 1),
            tokenSymbol: `${getTokenVisualMultiplier(positionOrder.indexToken)}${positionOrder.indexToken.symbol}`,
            tokenDecimals: positionOrder.indexToken.decimals,
          }
        : undefined;

      return {
        id: positionOrder.key,
        marketName: getMarketIndexName(positionOrder.marketInfo),
        orderType: positionOrder.orderType,
        isLong: order.isLong,
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
        updatedAtTime: order.updatedAtTime,
        sizeData,
      };
    });

  return orderLines;
});

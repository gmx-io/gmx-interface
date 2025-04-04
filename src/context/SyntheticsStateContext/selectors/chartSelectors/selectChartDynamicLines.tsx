import { USD_DECIMALS } from "config/factors";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import {
  selectChainId,
  selectOrdersInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { PositionOrderInfo, isSwapOrderType } from "domain/synthetics/orders";
import { getTokenData } from "domain/synthetics/tokens";
import { formatAmount } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { convertTokenAddress, getPriceDecimals } from "sdk/configs/tokens";
import { getMarketIndexName } from "sdk/utils/markets";

import { DynamicChartLine } from "components/TVChartContainer/types";

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

      const tokenVisualMultiplier = q(
        (state) =>
          getTokenData(selectTokensData(state), positionOrder.marketInfo.indexTokenAddress, "native")?.visualMultiplier
      );

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
      };
    });

  return orderLines;
});

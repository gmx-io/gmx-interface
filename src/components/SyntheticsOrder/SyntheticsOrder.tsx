import { t } from "@lingui/macro";
import { OrderType } from "config/synthetics";
import { getMarket, getMarketName, useMarketsData } from "domain/synthetics/markets";
import { Order } from "domain/synthetics/orders";
import {
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";

type Props = {
  order: Order;
};

export function SyntheticsOrder(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const { order } = p;

  const market = getMarket(marketsData, order.market);

  const isSwapOrder = [OrderType.MarketSwap, OrderType.LimitSwap].includes(order.type);
  const isPositionOrder = [
    OrderType.MarketIncrease,
    OrderType.LimitIncrease,
    OrderType.LimitDecrease,
    OrderType.StopLossDecrease,
  ].includes(order.type);

  const orderName = getOrderName();
  const swapPathText = order.swapPath.map((market) => getMarketName(marketsData, tokensData, market)).join(" > ");

  function getOrderName() {
    if (!market) return "";

    if (isPositionOrder) {
      const indexToken = getTokenData(tokensData, market.indexTokenAddress);

      const longText = order.isLong ? t`Long` : t`Short`;

      const sizeText = formatUsdAmount(order.sizeDeltaUsd);

      return `${longText} ${indexToken?.symbol || ""} ${sizeText}`;
    }

    if (isSwapOrder) {
      const initialToken = getTokenData(tokensData, order.initialCollateralToken);

      const amountText = formatTokenAmount(order.initialCollateralDeltaAmount, initialToken?.decimals || 0);
      const tokenText = initialToken?.symbol || "";

      return `${amountText} ${tokenText}`;
    }
  }

  return (
    <tr className="Exhange-list-item">
      <td>{order.typeLabel}</td>
      <td>
        {orderName} {swapPathText && `${t`via`} ${swapPathText}`}
      </td>
    </tr>
  );
}

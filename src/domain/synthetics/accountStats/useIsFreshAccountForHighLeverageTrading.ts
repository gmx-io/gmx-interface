import { useMemo } from "react";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { OrderType } from "../orders";
import { TradeActionType } from "../tradeHistory";
import { useTradeHistory } from "../tradeHistory/useTradeHistory";

export function useIsFreshAccountForHighLeverageTrading() {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);

  const { isLoading, tradeActions } = useTradeHistory(chainId, {
    account,
    pageSize: 10,
    orderEventCombinations: [
      {
        eventName: TradeActionType.OrderExecuted,
        orderType: [
          OrderType.MarketDecrease,
          OrderType.LimitDecrease,
          OrderType.StopLossDecrease,
          OrderType.Liquidation,
        ],
      },
    ],
  });

  const isFreshAccount = useMemo(() => {
    return !isLoading && tradeActions !== undefined && tradeActions.length < 10;
  }, [isLoading, tradeActions]);

  return isFreshAccount;
}

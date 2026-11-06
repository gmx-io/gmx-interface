import { getGmsolWrappedToken } from "config/gmsol/tokenLookup";
import type { OrdersInfoData } from "domain/synthetics/orders/types";
import { convertApiOrderToOrder } from "domain/synthetics/orders/useOrders";
import { setOrderInfoTitle } from "domain/synthetics/orders/utils";
import type { MarketsInfoData } from "sdk/utils/markets/types";
import { getOrderInfo } from "sdk/utils/orders";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { TokensData } from "sdk/utils/tokens/types";

type GmsolApiOrder = ApiOrderInfo & {
  actionState?: string;
  orderAccount?: string;
  positionAccount?: string;
  rentReceiver?: string;
};

function toApiOrder(apiOrder: GmsolApiOrder): ApiOrderInfo {
  const order = { ...apiOrder };
  delete order.actionState;
  delete order.orderAccount;
  delete order.positionAccount;
  delete order.rentReceiver;
  return order;
}

export function composeGmsolOrdersInfo(
  apiOrders: ApiOrderInfo[],
  { marketsInfoData, tokensData }: { marketsInfoData: MarketsInfoData; tokensData: TokensData }
): OrdersInfoData {
  const wrappedNativeToken = getGmsolWrappedToken();
  const ordersInfoData: OrdersInfoData = {};

  for (const apiOrder of apiOrders as GmsolApiOrder[]) {
    if (apiOrder.actionState === "completed" || apiOrder.actionState === "cancelled") {
      continue;
    }

    const order = convertApiOrderToOrder(toApiOrder(apiOrder));
    const orderInfo = getOrderInfo({ marketsInfoData, tokensData, wrappedNativeToken, order });

    // An order in a market the app does not list, or with an unknown token, stays out.
    if (!orderInfo) {
      continue;
    }

    setOrderInfoTitle(orderInfo, marketsInfoData[order.marketAddress]?.indexToken);
    ordersInfoData[orderInfo.key] = orderInfo;
  }

  return ordersInfoData;
}

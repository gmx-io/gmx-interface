import { getGmsolWrappedToken } from "config/gmsol/tokenLookup";
import type { OrdersInfoData } from "domain/synthetics/orders/types";
import { convertApiOrderToOrder } from "domain/synthetics/orders/useOrders";
import { setOrderInfoTitle } from "domain/synthetics/orders/utils";
import type { MarketsInfoData } from "sdk/utils/markets/types";
import { getOrderInfo } from "sdk/utils/orders";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { resolveGmsolAccountSnapshot } from "../resolveGmsolAccountSnapshot";

type GmsolApiOrder = ApiOrderInfo;

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
  {
    marketsInfoData,
    tokensData,
    previousData,
  }: { marketsInfoData: MarketsInfoData; tokensData: TokensData; previousData: OrdersInfoData | undefined }
) {
  const wrappedNativeToken = getGmsolWrappedToken();
  const ordersInfoData: OrdersInfoData = {};
  const keys: string[] = [];

  for (const apiOrder of apiOrders as GmsolApiOrder[]) {
    if (apiOrder.actionState === "completed" || apiOrder.actionState === "cancelled") {
      continue;
    }
    keys.push(apiOrder.key);

    const order = convertApiOrderToOrder(toApiOrder(apiOrder));
    const orderInfo = getOrderInfo({ marketsInfoData, tokensData, wrappedNativeToken, order });

    if (!orderInfo) {
      continue;
    }

    if (apiOrder.orderAccount && apiOrder.rentReceiver && apiOrder.actionState && apiOrder.escrowTokens) {
      orderInfo.solana = {
        orderAccount: apiOrder.orderAccount,
        rentReceiver: apiOrder.rentReceiver,
        actionState: apiOrder.actionState,
        positionAccount: apiOrder.positionAccount,
        referrer: apiOrder.referrer,
        callback: apiOrder.callback,
        escrowTokens: apiOrder.escrowTokens,
      };
    }

    setOrderInfoTitle(orderInfo, marketsInfoData[order.marketAddress]?.indexToken);
    ordersInfoData[orderInfo.key] = orderInfo;
  }

  return resolveGmsolAccountSnapshot({ keys, data: ordersInfoData, previousData });
}

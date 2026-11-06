import { getGmsolWrappedToken } from "config/gmsol/tokenLookup";
import type { OrdersInfoData } from "domain/synthetics/orders/types";
import { setOrderInfoTitle } from "domain/synthetics/orders/utils";
import type { MarketsInfoData } from "sdk/utils/markets/types";
import { getOrderInfo } from "sdk/utils/orders";
import type { ApiOrderInfo, DecreasePositionSwapType, Order, OrderType } from "sdk/utils/orders/types";
import type { TokensData } from "sdk/utils/tokens/types";

export type GmsolOrderActionState = "pending" | "completed" | "cancelled";

// Solana-only fields gmx-api adds to each order; kept on the order so edit, cancel and close can find
// the order account and its rent receiver.
export type GmsolOrderFields = {
  gmsolActionState: GmsolOrderActionState;
  orderAccount: string | undefined;
  positionAccount: string | undefined;
  rentReceiver: string | undefined;
};

type GmsolApiOrder = ApiOrderInfo & { uiFeeFactor?: bigint };

function parseActionState(value: string | undefined): GmsolOrderActionState {
  return value === "completed" || value === "cancelled" ? value : "pending";
}

// Like the EVM API mapper, without viem's checksum: Solana addresses are base58 and keep their case.
export function convertGmsolApiOrder(apiOrder: GmsolApiOrder): Order & GmsolOrderFields {
  const {
    triggerPrice,
    acceptablePrice,
    cancellationReceiver: _cancellationReceiver,
    srcChainId: _srcChainId,
    dataList,
    actionState,
    orderAccount,
    positionAccount,
    rentReceiver,
    ...rest
  } = apiOrder;

  return {
    uiFeeFactor: undefined,
    ...rest,
    orderType: rest.orderType as OrderType,
    decreasePositionSwapType: rest.decreasePositionSwapType as DecreasePositionSwapType,
    contractTriggerPrice: triggerPrice,
    contractAcceptablePrice: acceptablePrice,
    data: dataList,
    gmsolActionState: parseActionState(actionState),
    orderAccount,
    positionAccount,
    rentReceiver,
  };
}

// A completed order, a liquidation leftover included, still holds its account; it can only be closed,
// which returns the rent to the user.
export function getIsGmsolCloseOnlyOrder(order: object): boolean {
  const state = (order as Partial<GmsolOrderFields>).gmsolActionState;
  return state !== undefined && state !== "pending";
}

// Completed and cancelled accounts stay out of the shared list: they are not open orders.
export function getGmsolActiveOrdersInfo(ordersInfoData: OrdersInfoData): OrdersInfoData {
  const active: OrdersInfoData = {};

  for (const [key, order] of Object.entries(ordersInfoData)) {
    if (!getIsGmsolCloseOnlyOrder(order)) {
      active[key] = order;
    }
  }

  return active;
}

export function composeGmsolOrdersInfo(
  apiOrders: ApiOrderInfo[],
  { marketsInfoData, tokensData }: { marketsInfoData: MarketsInfoData; tokensData: TokensData }
): OrdersInfoData {
  const wrappedNativeToken = getGmsolWrappedToken();
  const ordersInfoData: OrdersInfoData = {};

  for (const apiOrder of apiOrders) {
    const order = convertGmsolApiOrder(apiOrder);
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

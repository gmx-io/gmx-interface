import { OrderType, type ApiOrderInfo, type OrderInfo } from "sdk/utils/orders/types";

import type { GmsolOrderContext, GmsolPositionOrderKind } from "./types";
import { requireGmsol } from "./validateTransaction";

export function getGmsolOrderContext(order: ApiOrderInfo | OrderInfo): GmsolOrderContext {
  const metadata = "solana" in order ? order.solana : "orderAccount" in order ? order : undefined;
  requireGmsol(
    metadata?.orderAccount && metadata.rentReceiver && metadata.escrowTokens,
    "Solana order account metadata is unavailable"
  );
  requireGmsol(metadata.actionState === "pending", "Solana order is no longer pending");
  // TODO(FESOL-56): validate callback-enabled order account metas before supporting their update/cancel path.
  requireGmsol(
    metadata.callback === undefined,
    "Callback orders are not supported by the pinned transaction validator"
  );
  const kinds: Partial<Record<number, GmsolPositionOrderKind>> = {
    [OrderType.MarketIncrease]: "MarketIncrease",
    [OrderType.LimitIncrease]: "LimitIncrease",
    [OrderType.MarketDecrease]: "MarketDecrease",
    [OrderType.LimitDecrease]: "LimitDecrease",
    [OrderType.StopLossDecrease]: "StopLossDecrease",
  };
  const kind = kinds[order.orderType];
  requireGmsol(kind, "Unsupported Solana order kind");
  return {
    kind,
    isLong: order.isLong,
    address: metadata.orderAccount,
    marketToken: order.marketAddress,
    owner: order.account,
    receiver: order.receiver,
    rentReceiver: metadata.rentReceiver,
    referrer: metadata.referrer,
    initialCollateralToken: metadata.escrowTokens.initialCollateralToken,
    finalOutputToken: metadata.escrowTokens.finalOutputToken,
    longToken: metadata.escrowTokens.longToken,
    shortToken: metadata.escrowTokens.shortToken,
    unwrapNative: order.shouldUnwrapNativeToken,
    callback: undefined,
  };
}

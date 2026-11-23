import { maxUint256 } from "viem";

import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { OrderInfo, PositionOrderInfo } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { applySlippageToPrice } from "sdk/utils/trade/trade";
import type { DecreasePositionAmounts } from "sdk/utils/trade/types";

import {
  buildGmsolTradeboxTriggerAction,
  getGmsolDecreaseMarket,
  getGmsolDecreaseSwapType,
  GmsolTradeboxError,
} from "../tradebox/buildTradeboxOrderAction";
import { WRAPPED_SOL_MINT } from "../transactions/addresses";
import { getGmsolOrderContext } from "../transactions/orderContext";
import type { GmsolOrderAction, GmsolOrderUpdate } from "../transactions/types";

/** A market close of an existing position, from the close modal's decrease amounts. */
export function buildGmsolCloseAction({
  position,
  decreaseAmounts,
  receiveToken,
  allowedSlippage,
}: {
  position: PositionInfo;
  decreaseAmounts: DecreasePositionAmounts;
  receiveToken: TokenData;
  allowedSlippage: number;
}): GmsolOrderAction {
  const market = getGmsolDecreaseMarket(position.marketInfo);
  if (decreaseAmounts.sizeDeltaUsd <= 0n || decreaseAmounts.sizeDeltaUsd > position.sizeInUsd)
    throw new GmsolTradeboxError("amounts");

  // Native SOL is the WSOL collateral unwrapped on receive; any other receive token would need a swap route.
  const receivesNativeSol =
    receiveToken.isNative === true &&
    receiveToken.address === NATIVE_TOKEN_ADDRESS &&
    position.collateralTokenAddress === WRAPPED_SOL_MINT;
  if (!receivesNativeSol && receiveToken.address !== position.collateralTokenAddress)
    throw new GmsolTradeboxError("receive");

  return {
    type: "create",
    atomic: false,
    orders: [
      {
        kind: "MarketDecrease",
        market,
        collateralToken: position.collateralTokenAddress,
        indexTokenDecimals: position.indexToken.decimals,
        isLong: position.isLong,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
        minOutput: 0n,
        acceptablePrice: applySlippageToPrice(allowedSlippage, decreaseAmounts.acceptablePrice, false, position.isLong),
        triggerPrice: undefined,
        payToken: undefined,
        payWithNativeSol: false,
        receiveToken: undefined,
        swapPath: [],
        unwrapNative: receivesNativeSol,
        validFromTs: undefined,
        decreaseSwapType: getGmsolDecreaseSwapType(decreaseAmounts.decreaseSwapType),
      },
    ],
  };
}

/** A new take-profit or stop-loss on an existing position. */
export function buildGmsolTriggerAction(position: PositionInfo, amounts: DecreasePositionAmounts): GmsolOrderAction {
  return buildGmsolTradeboxTriggerAction({
    marketInfo: position.marketInfo,
    collateralToken: position.collateralToken,
    amounts,
    isLong: position.isLong,
  });
}

/** Only the fields that changed go into the update; an update with no changes is rejected. */
export function buildGmsolUpdateAction({
  order,
  changes,
}: {
  order: PositionOrderInfo;
  changes: Pick<GmsolOrderUpdate, "sizeDeltaUsd" | "triggerPrice" | "acceptablePrice">;
}): GmsolOrderAction {
  const context = getGmsolOrderContext(order);
  // 0 and maxUint256 are EVM "unlimited" sentinels; the pinned SDK cannot set an unlimited price, so they leave it as is.
  const isUnlimited = (price: bigint) => price <= 0n || price === maxUint256;
  const pick = (next: bigint | undefined, current: bigint) =>
    next === undefined || next === current || isUnlimited(next) ? undefined : next;
  const update: GmsolOrderUpdate = {
    kind: context.kind,
    indexTokenDecimals: order.indexToken.decimals,
    isLong: order.isLong,
    sizeDeltaUsd: pick(changes.sizeDeltaUsd, order.sizeDeltaUsd),
    triggerPrice: pick(changes.triggerPrice, order.triggerPrice),
    acceptablePrice: pick(changes.acceptablePrice, order.acceptablePrice),
    minOutput: undefined,
    validFromTs: undefined,
  };
  // Keeping a bounded acceptable price while the trigger moves can leave the order unexecutable,
  // and the order cannot be made unlimited on Solana, so the edit is refused instead.
  const dropsAcceptablePrice =
    changes.acceptablePrice !== undefined &&
    isUnlimited(changes.acceptablePrice) &&
    !isUnlimited(order.acceptablePrice);
  const hasOtherChanges = update.sizeDeltaUsd !== undefined || update.triggerPrice !== undefined;
  if (dropsAcceptablePrice && (update.triggerPrice !== undefined || !hasOtherChanges))
    throw new GmsolTradeboxError("acceptablePrice");
  if (!hasOtherChanges && update.acceptablePrice === undefined) throw new GmsolTradeboxError("amounts");

  return { type: "update", order: context, changes: update };
}

/** Order account, rent receiver, referrer and escrow come from gmx-api /v1/orders through `order.solana`. */
export function buildGmsolCancelAction(order: OrderInfo): GmsolOrderAction {
  return { type: "cancel", order: getGmsolOrderContext(order) };
}

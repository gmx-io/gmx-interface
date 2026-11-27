import { maxUint256 } from "viem";

import { getIsSolanaCollateralToken } from "domain/solana/solanaReceiveTokens";
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
import { getGmsolOrderAccounts, getGmsolOrderContext } from "../transactions/orderContext";
import type { GmsolOrderAction, GmsolOrderUpdate } from "../transactions/types";

// Native SOL is the WSOL collateral unwrapped on receive; any other receive token would need a swap route.
function getReceivesNativeSol(position: PositionInfo, receiveToken: TokenData) {
  const receivesNativeSol =
    receiveToken.isNative === true &&
    receiveToken.address === NATIVE_TOKEN_ADDRESS &&
    position.collateralTokenAddress === WRAPPED_SOL_MINT;
  if (!receivesNativeSol && receiveToken.address !== position.collateralTokenAddress)
    throw new GmsolTradeboxError("receive");
  return receivesNativeSol;
}

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
  const receivesNativeSol = getReceivesNativeSol(position, receiveToken);

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

/**
 * A collateral deposit: a market increase with no size, which gmsol also accepts while the market is closed.
 * Native SOL is wrapped into the WSOL collateral, as in the trade box.
 */
export function buildGmsolDepositAction({
  position,
  payToken,
  amount,
  allowedSlippage,
}: {
  position: PositionInfo;
  payToken: TokenData;
  amount: bigint;
  allowedSlippage: number;
}): GmsolOrderAction {
  const market = getGmsolDecreaseMarket(position.marketInfo);
  if (amount <= 0n) throw new GmsolTradeboxError("amounts");
  const payWithNativeSol = payToken.isNative === true && payToken.address === NATIVE_TOKEN_ADDRESS;
  const payTokenAddress = payWithNativeSol ? payToken.wrappedAddress : payToken.address;
  if (!getIsSolanaCollateralToken(payToken, position.collateralToken)) throw new GmsolTradeboxError("swap");

  return {
    type: "create",
    atomic: false,
    orders: [
      {
        kind: "MarketIncrease",
        market,
        collateralToken: position.collateralTokenAddress,
        indexTokenDecimals: position.indexToken.decimals,
        isLong: position.isLong,
        sizeDeltaUsd: 0n,
        collateralDeltaAmount: amount,
        minOutput: 0n,
        acceptablePrice: applySlippageToPrice(allowedSlippage, position.markPrice, true, position.isLong),
        triggerPrice: undefined,
        payToken: payTokenAddress,
        payWithNativeSol,
        receiveToken: undefined,
        swapPath: [],
        // gmsol refunds a cancelled order's escrowed WSOL as native SOL only with this flag.
        unwrapNative: payWithNativeSol,
        validFromTs: undefined,
        decreaseSwapType: undefined,
      },
    ],
  };
}

/** A collateral withdrawal: a market decrease with no size, paid out in the collateral token or native SOL. */
export function buildGmsolWithdrawAction({
  position,
  amount,
  receiveToken,
  allowedSlippage,
}: {
  position: PositionInfo;
  amount: bigint;
  receiveToken: TokenData;
  allowedSlippage: number;
}): GmsolOrderAction {
  const market = getGmsolDecreaseMarket(position.marketInfo);
  if (amount <= 0n || amount > position.collateralAmount) throw new GmsolTradeboxError("amounts");
  const receivesNativeSol = getReceivesNativeSol(position, receiveToken);

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
        sizeDeltaUsd: 0n,
        collateralDeltaAmount: amount,
        minOutput: 0n,
        acceptablePrice: applySlippageToPrice(allowedSlippage, position.markPrice, false, position.isLong),
        triggerPrice: undefined,
        payToken: undefined,
        payWithNativeSol: false,
        receiveToken: undefined,
        swapPath: [],
        unwrapNative: receivesNativeSol,
        validFromTs: undefined,
        decreaseSwapType: "NoSwap",
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
  // Unlimited: 0, maxUint256, or a stored u128::MAX scaled up by the index decimals; the pinned SDK cannot set it.
  const isUnlimited = (price: bigint) => price <= 0n || price >= maxUint256;
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
  return { type: "cancel", order: getGmsolOrderAccounts(order) };
}

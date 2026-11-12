import { GMSOL_MARKETS } from "config/gmsol/markets";
import { SOLANA_TOKEN_PROGRAM_ID } from "config/gmsol/program";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import type { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/types";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { MarketInfo } from "sdk/utils/markets/types";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { applySlippageToPrice } from "sdk/utils/trade/trade";
import { TradeMode, type IncreasePositionAmounts } from "sdk/utils/trade/types";

import type { GmsolCreateOrder, GmsolOrderAction } from "../transactions/types";

export type GmsolTradeboxErrorCode = "market" | "math" | "mode" | "amounts" | "swap" | "tokenProgram" | "tpsl";

export class GmsolTradeboxError extends Error {
  constructor(readonly code: GmsolTradeboxErrorCode) {
    super(`Solana order entry is unavailable: ${code}`);
    this.name = "GmsolTradeboxError";
  }
}

/** Shared previews stay in application units; the transaction adapter owns ABI conversion. */
export function buildGmsolTradeboxOrderAction({
  marketInfo,
  fromToken,
  collateralToken,
  amounts,
  tradeMode,
  isLong,
  sidecarEntries,
  allowedSlippage,
}: {
  marketInfo: MarketInfo | undefined;
  fromToken: TokenData | undefined;
  collateralToken: TokenData | undefined;
  amounts: IncreasePositionAmounts | undefined;
  tradeMode: TradeMode;
  isLong: boolean;
  sidecarEntries: readonly SidecarOrderEntry[];
  allowedSlippage: number;
}): GmsolOrderAction {
  const market = GMSOL_MARKETS.find((item) => item.marketTokenAddress === marketInfo?.marketTokenAddress);
  if (!market || !marketInfo || marketInfo.isDisabled) throw new GmsolTradeboxError("market");
  if (marketInfo.tradeMath !== "gmsol") throw new GmsolTradeboxError("math");
  if (tradeMode !== TradeMode.Market && tradeMode !== TradeMode.Limit) throw new GmsolTradeboxError("mode");
  if (!fromToken || !collateralToken || !amounts || amounts.initialCollateralAmount <= 0n || amounts.sizeDeltaUsd <= 0n)
    throw new GmsolTradeboxError("amounts");
  const payWithNativeSol = fromToken.isNative === true && fromToken.address === NATIVE_TOKEN_ADDRESS;
  const payToken = payWithNativeSol ? fromToken.wrappedAddress : fromToken.address;
  if (
    payToken !== collateralToken.address ||
    amounts.swapStrategy.type !== "noSwap" ||
    (collateralToken.address !== market.longTokenAddress && collateralToken.address !== market.shortTokenAddress)
  )
    throw new GmsolTradeboxError("swap");
  if (
    [market.longTokenAddress, market.shortTokenAddress].some(
      (mint) => GMSOL_TOKENS.find((token) => token.address === mint)?.tokenProgram !== SOLANA_TOKEN_PROGRAM_ID
    )
  )
    throw new GmsolTradeboxError("tokenProgram");
  if (tradeMode === TradeMode.Limit && amounts.limitOrderType !== OrderType.LimitIncrease)
    throw new GmsolTradeboxError("mode");
  const primary: GmsolCreateOrder = {
    kind: tradeMode === TradeMode.Market ? "MarketIncrease" : "LimitIncrease",
    market,
    collateralToken: collateralToken.address,
    indexTokenDecimals: marketInfo.indexToken.decimals,
    isLong,
    sizeDeltaUsd: amounts.sizeDeltaUsd,
    // The request escrows the payment, before execution fees/impact affect the preview.
    collateralDeltaAmount: amounts.initialCollateralAmount,
    minOutput: 0n,
    acceptablePrice:
      tradeMode === TradeMode.Market
        ? applySlippageToPrice(allowedSlippage, amounts.acceptablePrice, true, isLong)
        : amounts.acceptablePrice,
    triggerPrice: tradeMode === TradeMode.Limit ? amounts.triggerPrice : undefined,
    payToken,
    payWithNativeSol,
    receiveToken: undefined,
    swapPath: [],
    unwrapNative: false,
    validFromTs: undefined,
    decreaseSwapType: undefined,
  };
  const triggers = sidecarEntries
    .filter((entry) => entry.txnType !== null)
    .map((entry): GmsolCreateOrder => {
      const decrease = entry.decreaseAmounts;
      if (
        entry.txnType !== "create" ||
        !decrease ||
        entry.price.error ||
        entry.sizeUsd.error ||
        entry.percentage.error ||
        (decrease.triggerOrderType !== OrderType.LimitDecrease &&
          decrease.triggerOrderType !== OrderType.StopLossDecrease) ||
        decrease.sizeDeltaUsd <= 0n ||
        decrease.sizeDeltaUsd > primary.sizeDeltaUsd
      )
        throw new GmsolTradeboxError("tpsl");
      return {
        ...primary,
        kind: decrease.triggerOrderType === OrderType.LimitDecrease ? "LimitDecrease" : "StopLossDecrease",
        sizeDeltaUsd: decrease.sizeDeltaUsd,
        collateralDeltaAmount: decrease.collateralDeltaAmount,
        minOutput: 0n,
        triggerPrice: decrease.triggerPrice,
        acceptablePrice: decrease.acceptablePrice,
        decreaseSwapType: getGmsolDecreaseSwapType(decrease.decreaseSwapType),
        payToken: undefined,
        payWithNativeSol: false,
      };
    });
  if (triggers.length > 2 || new Set(triggers.map((order) => order.kind)).size !== triggers.length)
    throw new GmsolTradeboxError("tpsl");
  return { type: "create", orders: [primary, ...triggers], atomic: triggers.length > 0 };
}

/** The shared TP/SL tab creates a trigger against the selected existing position. */
export function buildGmsolTradeboxTriggerAction({
  marketInfo,
  collateralToken,
  amounts,
  isLong,
}: {
  marketInfo: MarketInfo | undefined;
  collateralToken: TokenData | undefined;
  amounts: import("sdk/utils/trade/types").DecreasePositionAmounts | undefined;
  isLong: boolean;
}): GmsolOrderAction {
  const market = GMSOL_MARKETS.find((item) => item.marketTokenAddress === marketInfo?.marketTokenAddress);
  if (!market || !marketInfo || marketInfo.isDisabled) throw new GmsolTradeboxError("market");
  if (marketInfo.tradeMath !== "gmsol") throw new GmsolTradeboxError("math");
  if (
    !collateralToken ||
    !amounts ||
    amounts.sizeDeltaUsd <= 0n ||
    amounts.triggerPrice === undefined ||
    amounts.triggerPrice <= 0n
  )
    throw new GmsolTradeboxError("amounts");
  if (amounts.triggerOrderType !== OrderType.LimitDecrease && amounts.triggerOrderType !== OrderType.StopLossDecrease)
    throw new GmsolTradeboxError("mode");
  if (
    [market.longTokenAddress, market.shortTokenAddress].some(
      (mint) => GMSOL_TOKENS.find((token) => token.address === mint)?.tokenProgram !== SOLANA_TOKEN_PROGRAM_ID
    )
  )
    throw new GmsolTradeboxError("tokenProgram");
  return {
    type: "create",
    atomic: false,
    orders: [
      {
        market,
        kind: amounts.triggerOrderType === OrderType.LimitDecrease ? "LimitDecrease" : "StopLossDecrease",
        collateralToken: collateralToken.address,
        indexTokenDecimals: marketInfo.indexToken.decimals,
        isLong,
        sizeDeltaUsd: amounts.sizeDeltaUsd,
        collateralDeltaAmount: amounts.collateralDeltaAmount,
        minOutput: 0n,
        acceptablePrice: amounts.acceptablePrice,
        triggerPrice: amounts.triggerPrice,
        payToken: undefined,
        payWithNativeSol: false,
        receiveToken: undefined,
        swapPath: [],
        unwrapNative: false,
        validFromTs: undefined,
        decreaseSwapType: getGmsolDecreaseSwapType(amounts.decreaseSwapType),
      },
    ],
  };
}

function getGmsolDecreaseSwapType(type: DecreasePositionSwapType) {
  switch (type) {
    case DecreasePositionSwapType.NoSwap:
      return "NoSwap" as const;
    case DecreasePositionSwapType.SwapPnlTokenToCollateralToken:
      return "PnlTokenToCollateralToken" as const;
    case DecreasePositionSwapType.SwapCollateralTokenToPnlToken:
      return "CollateralToPnlToken" as const;
    default:
      throw new GmsolTradeboxError("swap");
  }
}

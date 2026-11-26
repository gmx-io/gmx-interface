import { GMSOL_MARKETS } from "config/gmsol/markets";
import { SOLANA_TOKEN_PROGRAM_ID } from "config/gmsol/program";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import { getIsSolanaCollateralToken } from "domain/solana/solanaReceiveTokens";
import type { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/types";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { MarketInfo } from "sdk/utils/markets/types";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { applySlippageToPrice } from "sdk/utils/trade/trade";
import { TradeMode, type DecreasePositionAmounts, type IncreasePositionAmounts } from "sdk/utils/trade/types";

import type { GmsolCreateOrder, GmsolOrderAction } from "../transactions/types";

export type GmsolTradeboxErrorCode =
  | "market"
  | "math"
  | "mode"
  | "amounts"
  | "swap"
  | "receive"
  | "acceptablePrice"
  | "tokenProgram"
  | "tpsl"
  | "tpslEdit";

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
  existingPositionSizeUsd,
}: {
  marketInfo: MarketInfo | undefined;
  fromToken: TokenData | undefined;
  collateralToken: TokenData | undefined;
  amounts: IncreasePositionAmounts | undefined;
  tradeMode: TradeMode;
  isLong: boolean;
  sidecarEntries: readonly SidecarOrderEntry[];
  allowedSlippage: number;
  existingPositionSizeUsd: bigint | undefined;
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
    !getIsSolanaCollateralToken(fromToken, collateralToken) ||
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
    // gmsol refunds a cancelled order's escrowed WSOL as native SOL only with this flag.
    unwrapNative: payWithNativeSol,
    validFromTs: undefined,
    decreaseSwapType: undefined,
  };
  const triggers = getGmsolTradeboxTriggerEntries(sidecarEntries).map((entry): GmsolCreateOrder => {
    if (entry.txnType !== "create") throw new GmsolTradeboxError("tpslEdit");
    const decrease = entry.decreaseAmounts;
    if (
      !decrease ||
      entry.price.error ||
      entry.sizeUsd.error ||
      entry.percentage.error ||
      (decrease.triggerOrderType !== OrderType.LimitDecrease &&
        decrease.triggerOrderType !== OrderType.StopLossDecrease) ||
      decrease.sizeDeltaUsd <= 0n ||
      decrease.sizeDeltaUsd > (existingPositionSizeUsd ?? 0n) + primary.sizeDeltaUsd
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
      unwrapNative: false,
    };
  });
  if (
    triggers.length > 2 ||
    new Set(triggers.map((order) => order.kind)).size !== triggers.length ||
    (triggers.length > 0 && primary.kind === "LimitIncrease")
  )
    throw new GmsolTradeboxError("tpsl");
  return { type: "create", orders: [primary, ...triggers], atomic: triggers.length > 0, existingPositionSizeUsd };
}

/** Rows that reach the order: a new row the user cleared has no price and is left out, as on EVM. */
export function getGmsolTradeboxTriggerEntries(entries: readonly SidecarOrderEntry[]) {
  return entries.filter(
    (entry) => entry.txnType !== null && !(entry.txnType === "create" && entry.price.value === null)
  );
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
  amounts: DecreasePositionAmounts | undefined;
  isLong: boolean;
}): GmsolOrderAction {
  const market = getGmsolDecreaseMarket(marketInfo);
  if (
    !marketInfo ||
    !collateralToken ||
    !amounts ||
    amounts.sizeDeltaUsd <= 0n ||
    amounts.triggerPrice === undefined ||
    amounts.triggerPrice <= 0n
  )
    throw new GmsolTradeboxError("amounts");
  if (amounts.triggerOrderType !== OrderType.LimitDecrease && amounts.triggerOrderType !== OrderType.StopLossDecrease)
    throw new GmsolTradeboxError("mode");
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

/** The listed market a decrease order on an existing position goes to, with the checks the order builder repeats. */
export function getGmsolDecreaseMarket(marketInfo: MarketInfo | undefined) {
  const market = GMSOL_MARKETS.find((item) => item.marketTokenAddress === marketInfo?.marketTokenAddress);
  if (!market || !marketInfo || marketInfo.isDisabled) throw new GmsolTradeboxError("market");
  if (marketInfo.tradeMath !== "gmsol") throw new GmsolTradeboxError("math");
  if (
    [market.longTokenAddress, market.shortTokenAddress].some(
      (mint) => GMSOL_TOKENS.find((token) => token.address === mint)?.tokenProgram !== SOLANA_TOKEN_PROGRAM_ID
    )
  )
    throw new GmsolTradeboxError("tokenProgram");
  return market;
}

export function getGmsolDecreaseSwapType(type: DecreasePositionSwapType) {
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

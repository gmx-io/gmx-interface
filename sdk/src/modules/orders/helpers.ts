import type { GmxSdk } from "../../index";
import { getIncreasePositionAmounts } from "utils/trade/amounts";
import { OrderType } from "types/orders";
import { createFindSwapPath } from "utils/swap/swapPath";

export type PositionIncreaseParams = (
  | {
      payAmount: bigint;
    }
  | {
      sizeAmount: bigint;
    }
) & {
  marketAddress: string;
  payTokenAddress: string;

  collateralIn: string;

  /** @default 100 */
  allowedSlippageBps?: number;
  referralCodeForTxn?: string;
  uiFeeFactor: bigint;

  leverage?: bigint;
  /** If presented, then it's limit order */
  limitPrice?: bigint;
  /** If presented, then it's stop market order */
  stopPrice?: bigint;
  /** Tp sl entries  */
  tpSl?: {
    valueBps: number;
    price: bigint;
  }[];
  receiveTokenAddress?: string;
  acceptablePriceImpactBuffer?: number;
  fixedAcceptablePriceImpactBps?: bigint;

  skipSimulation?: boolean;
};

export async function increaseOrderHelper(
  sdk: GmxSdk,
  params: PositionIncreaseParams & {
    isLong: boolean;
  }
) {
  const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

  if (!tokensData) {
    throw new Error("Tokens data is not available");
  }

  if (!marketsInfoData) {
    throw new Error("Markets info data is not available");
  }

  const isLimit = Boolean(params.limitPrice);

  const fromToken = tokensData[params.payTokenAddress];
  const collateralToken = tokensData[params.collateralIn];

  if (!fromToken) {
    throw new Error("From token is not available");
  }

  if (!collateralToken) {
    throw new Error("Collateral token is not available");
  }

  if (params.tpSl && params.tpSl.length > 0 && !params.receiveTokenAddress) {
    throw new Error("Receive token address is required for tp/sl orders");
  }

  const marketInfo = marketsInfoData[params.marketAddress];

  if (!marketInfo) {
    throw new Error("Market info is not available");
  }

  const receiveTokenAddress = params.receiveTokenAddress ?? collateralToken.address;
  const allowedSlippage = params.allowedSlippageBps ?? 100;

  const findSwapPath = createFindSwapPath({
    chainId: sdk.chainId,
    fromTokenAddress: params.payTokenAddress,
    toTokenAddress: receiveTokenAddress,
    marketsInfoData,
  });

  const payOrSizeAmount = "payAmount" in params ? params.payAmount : params.sizeAmount;

  const increaseAmounts = getIncreasePositionAmounts({
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: collateralToken,
    collateralToken,
    isLong: params.isLong,
    initialCollateralAmount: payOrSizeAmount,
    position: undefined,
    indexTokenAmount: payOrSizeAmount,
    leverage: params.leverage,
    triggerPrice: params.limitPrice,
    limitOrderType: params.limitPrice ? OrderType.LimitIncrease : undefined,
    userReferralInfo: undefined,
    strategy: "payAmount" in params ? "leverageByCollateral" : "leverageBySize",
    findSwapPath: findSwapPath,
    uiFeeFactor: params.uiFeeFactor,
    acceptablePriceImpactBuffer: params.acceptablePriceImpactBuffer,
    fixedAcceptablePriceImpactBps: params.fixedAcceptablePriceImpactBps,
  });

  const createIncreaseOrderParams: Parameters<typeof sdk.orders.createIncreaseOrder>[0] = {
    marketsInfoData,
    tokensData,
    isLimit,
    marketAddress: params.marketAddress,
    fromToken: tokensData[params.payTokenAddress],
    allowedSlippage,
    collateralToken,
    referralCodeForTxn: params.referralCodeForTxn,
    triggerPrice: params.limitPrice,
    collateralTokenAddress: collateralToken.address,
    isLong: true,
    receiveTokenAddress,
    indexToken: marketInfo.indexToken,
    marketInfo,
    skipSimulation: params.skipSimulation,
    increaseAmounts,
  };

  return sdk.orders.createIncreaseOrder(createIncreaseOrderParams);
}

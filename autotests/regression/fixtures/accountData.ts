import { toHex, zeroAddress } from "viem";

import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { hashedPositionKey } from "../../../sdk/src/configs/dataStore";
import { MARKETS } from "../../../sdk/src/configs/markets";
import { getToken, getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import type { ApiOrderInfo } from "../../../sdk/src/utils/orders/types";
import { getPositionKey } from "../../../sdk/src/utils/positions/utils";
import type { ApiPositionInfo } from "../../../sdk/src/utils/positions/types";

const USD = 10n ** 30n;

export function accountData(chainId: number, account: string, symbol = "ETH") {
  const collateral = getTokenBySymbol(chainId, "USDC");
  const index = getTokenBySymbol(chainId, symbol === "ETH" && chainId === 42161 ? "WETH" : symbol);
  const market = Object.values(MARKETS[chainId as ContractsChainId]).find(
    (market) => market.indexTokenAddress === index.address && market.shortTokenAddress === collateral.address
  );
  if (!market) throw new Error(`No ${symbol}/USDC market configured for the state fixture`);
  const updatedAt = BigInt(Math.floor(Date.now() / 1000) - 120);

  const position = (isLong: boolean): ApiPositionInfo => ({
    key: getPositionKey(account, market.marketTokenAddress, collateral.address, isLong),
    contractKey: hashedPositionKey(account, market.marketTokenAddress, collateral.address, isLong),
    account,
    marketAddress: market.marketTokenAddress,
    collateralTokenAddress: collateral.address,
    sizeInUsd: 1000n * USD,
    sizeInTokens: 4n * 10n ** 17n,
    collateralAmount: 250n * 10n ** 6n,
    pendingBorrowingFeesUsd: 0n,
    increasedAtTime: updatedAt,
    decreasedAtTime: 0n,
    isLong,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    pnl: 0n,
    positionFeeAmount: 0n,
    traderDiscountAmount: 0n,
    uiFeeAmount: 0n,
    pendingImpactAmount: 0n,
    positionValueInUsd: 1000n * USD,
    data: "0x",
    indexName: `${symbol}/USD`,
    poolName: `${getToken(chainId, market.longTokenAddress).symbol}-USDC`,
    markPrice: 2500n * USD,
    entryPrice: 2500n * USD,
    liquidationPrice: (isLong ? 1900n : 3100n) * USD,
    collateralUsd: 250n * USD,
    remainingCollateralUsd: 250n * USD,
    remainingCollateralAmount: 250n * 10n ** 6n,
    hasLowCollateral: false,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    netValueAfterAllFees: 250n * USD,
    pnlAfterAllFees: 0n,
    pnlAfterAllFeesPercentage: 0n,
    netPriceImapctDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
    pendingImpactUsd: 0n,
    closePriceImpactDeltaUsd: 0n,
    leverage: 40000n,
    leverageWithPnl: 40000n,
    leverageWithoutPnl: 40000n,
    netValue: 250n * USD,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
  });

  const order = (orderType: number, isLong = true, id = orderType): ApiOrderInfo => ({
    key: toHex(id, { size: 32 }),
    account,
    receiver: account,
    cancellationReceiver: account,
    callbackContract: zeroAddress,
    uiFeeReceiver: zeroAddress,
    marketAddress: market.marketTokenAddress,
    initialCollateralTokenAddress: collateral.address,
    swapPath: [],
    orderType,
    decreasePositionSwapType: 0,
    sizeDeltaUsd: 1000n * USD,
    initialCollateralDeltaAmount: 250n * 10n ** 6n,
    triggerPrice: 2000n * 10n ** 12n,
    acceptablePrice: 2010n * 10n ** 12n,
    executionFee: 10n ** 14n,
    callbackGasLimit: 0n,
    minOutputAmount: 0n,
    updatedAtTime: updatedAt,
    validFromTime: 0n,
    srcChainId: 0n,
    isLong,
    shouldUnwrapNativeToken: false,
    isFrozen: false,
    autoCancel: false,
    dataList: [],
  });

  return { position, order, market, collateral, index };
}

export function serializeAccountData(value: unknown) {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}

import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { convertToTokenAmount, getTokenData, TokensData } from "domain/synthetics/tokens";
import { applyFactor, expandDecimals, getBasisPoints } from "lib/numbers";
import { ExecutionFeeParams, FeeItem, MarketsFeesConfigsData } from "../types";
import { BigNumber } from "ethers";

export * from "./priceImpact";
export * from "./swapFees";

export function getMarketFeesConfig(feeConfigsData: MarketsFeesConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return feeConfigsData[marketAddress];
}

export function getPositionFee(
  feeConfigs: MarketsFeesConfigsData,
  marketAddress?: string,
  sizeDeltaUsd?: BigNumber,
  collateralUsd?: BigNumber
): FeeItem | undefined {
  const feeConfig = getMarketFeesConfig(feeConfigs, marketAddress);

  if (!feeConfig || !sizeDeltaUsd) return undefined;

  const feeUsd = applyFactor(sizeDeltaUsd, feeConfig.positionFeeFactor);
  const bps = collateralUsd?.gt(0) ? getBasisPoints(feeUsd, collateralUsd) : BigNumber.from(0);

  return {
    deltaUsd: feeUsd.mul(-1),
    bps,
  };
}

export function getTotalFeeItem(feeItems: FeeItem[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: BigNumber.from(0),
    bps: BigNumber.from(0),
  };

  feeItems.forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd.add(feeItem.deltaUsd);
    totalFeeItem.bps = totalFeeItem.bps.add(feeItem.bps);
  });

  return totalFeeItem;
}

export function getExecutionFee(tokensData: TokensData): ExecutionFeeParams | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken?.prices) return undefined;

  const feeUsd = expandDecimals(2, 28);
  const feeTokenAmount = convertToTokenAmount(feeUsd, nativeToken.decimals, nativeToken.prices.maxPrice);

  return {
    feeUsd: feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
  };
}

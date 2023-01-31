import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { convertToTokenAmount, getTokenData, TokensData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { ExecutionFeeParams, MarketsFeesConfigsData } from "../types";

export * from "./priceImpact";
export * from "./swapFees";

export function getMarketFeesConfig(feeConfigsData: MarketsFeesConfigsData, marketAddress: string | undefined) {
  if (!marketAddress) return undefined;

  return feeConfigsData[marketAddress];
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

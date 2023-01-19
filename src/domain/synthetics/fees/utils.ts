import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { TokenPrices, TokensData, convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatUsd, parseValue, roundUpDivision } from "lib/numbers";
import { MarketsData, MarketsPoolsData, getPoolAmountUsd } from "../markets";
import { ExecutionFeeParams, PriceImpactConfigsData } from "./types";
import { getPriceImpact } from "./utils/priceImpact";

export function formatFee(feeUsd?: BigNumber, feeBp?: BigNumber) {
  if (!feeUsd?.abs().gt(0)) {
    return "...";
  }
  const isNegative = feeUsd.lt(0);

  return feeBp ? `${isNegative ? "-" : ""}${formatAmount(feeBp, 2, 2)}% (${formatUsd(feeUsd)})` : formatUsd(feeUsd);
}

export function getExecutionFee(tokensData: TokensData): ExecutionFeeParams | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken?.prices) return undefined;

  const feeUsd = expandDecimals(1, 28);
  const feeTokenAmount = convertToTokenAmount(feeUsd, nativeToken.decimals, nativeToken.prices.maxPrice);

  return {
    feeUsd: feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
  };
}

export function getSwapFee(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  priceImpactConfigsData: PriceImpactConfigsData,
  market: string,
  fromToken: string,
  toToken: string,
  usdAmount: BigNumber
) {
  const fromPoolUsd = getPoolAmountUsd(marketsData, poolsData, tokensData, market, fromToken, "midPrice");
  const toPoolUsd = getPoolAmountUsd(marketsData, poolsData, tokensData, market, toToken, "midPrice");

  const fromDelta = usdAmount;
  const toDelta = BigNumber.from(0).sub(usdAmount);

  const priceImpact = getPriceImpact(priceImpactConfigsData, market, fromPoolUsd, toPoolUsd, fromDelta, toDelta);

  if (!priceImpact) return undefined;

  // TODO: get swap fee from contract
  const swapFee = BigNumber.from(0).sub(parseValue("0.01", USD_DECIMALS)!);

  return {
    swapFee,
    priceImpact,
  };
}

export function applySwapImpactWithCap(p: { tokenPrices: TokenPrices; priceImpactUsd: BigNumber }) {
  // positive impact: minimize impactAmount, use tokenPrice.max
  // negative impact: maximize impactAmount, use tokenPrice.min
  const price = p.priceImpactUsd.gt(0) ? p.tokenPrices.maxPrice : p.tokenPrices.minPrice;

  let impactAmount: BigNumber;

  if (p.priceImpactUsd.gt(0)) {
    // round positive impactAmount down, this will be deducted from the swap impact pool for the user
    impactAmount = p.priceImpactUsd.div(price);

    // const maxImpactAmount = getSwapImpactPoolAmount(dataStore, market, token).toInt256();

    // if (impactAmount > maxImpactAmount) {
    //     impactAmount = maxImpactAmount;
    // }
  } else {
    // round negative impactAmount up, this will be deducted from the user
    impactAmount = roundUpDivision(p.priceImpactUsd, price);
  }

  return impactAmount;
}

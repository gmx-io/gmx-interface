import { BigNumber } from "ethers";
import { getVisibleTokens } from "../../config/Tokens";
import {
  bigNumberify,
  expandDecimals,
  getFeeBasisPoints,
  getTokenInfo,
  MINT_BURN_FEE_BASIS_POINTS,
  PRECISION,
  TAX_BASIS_POINTS,
  USDG_DECIMALS,
  USD_DECIMALS,
} from "../../lib/legacy";
import { InfoTokens, Token } from "./types";

export function getLowestFeeTokenForBuyGlp(
  chainId: number,
  toAmount: BigNumber,
  glpPrice: BigNumber,
  usdgSupply: BigNumber,
  totalTokenWeights: BigNumber,
  infoTokens: InfoTokens,
  fromTokenAddress: string,
  swapUsdMin: BigNumber
): { token: Token; fees: number; amountLeftToDeposit: BigNumber } | undefined {
  if (!chainId || !toAmount || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights || !swapUsdMin) {
    return;
  }

  const tokens = getVisibleTokens(chainId);
  const usdgAmount = toAmount.mul(glpPrice).div(PRECISION);
  const tokensData = tokens.map((token) => {
    const fromToken = getTokenInfo(infoTokens, token.address);
    const fees = getFeeBasisPoints(
      fromToken,
      usdgAmount,
      MINT_BURN_FEE_BASIS_POINTS,
      TAX_BASIS_POINTS,
      true,
      usdgSupply,
      totalTokenWeights
    );
    let amountLeftToDeposit = bigNumberify(0);
    if (fromToken.maxUsdgAmount && fromToken.maxUsdgAmount.gt(0)) {
      amountLeftToDeposit = fromToken.maxUsdgAmount
        .sub(fromToken.usdgAmount)
        .mul(expandDecimals(1, USD_DECIMALS))
        .div(expandDecimals(1, USDG_DECIMALS));
    }
    return { token, fees, amountLeftToDeposit };
  });

  const tokensWithLiquidity = tokensData
    .filter(
      (asset) =>
        asset.token.address !== fromTokenAddress &&
        asset.hasOwnProperty("fees") &&
        swapUsdMin.lt(asset.amountLeftToDeposit)
    )
    .sort((a, b) => a.fees - b.fees);
  return tokensWithLiquidity.length > 0
    ? tokensWithLiquidity[0]
    : tokensData.sort((a, b) => b.amountLeftToDeposit.sub(a.amountLeftToDeposit))[0];
}

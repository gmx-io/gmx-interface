import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { PRECISION, adjustForDecimals } from "lib/legacy";

export function getAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BigNumber;
  ratio: BigNumber;
  invertRatio?: boolean;
}) {
  const ratio = p.invertRatio ? PRECISION.mul(PRECISION).div(p.ratio) : p.ratio;

  const adjustedDecimalsRatio = adjustForDecimals(ratio, p.fromToken.decimals, p.toToken.decimals);

  return p.fromTokenAmount.mul(adjustedDecimalsRatio).div(PRECISION);
}

import { encodeFunctionData } from "viem";

import StBTCABI from "abis/StBTC";
import { BOTANIX } from "configs/chains";
import { getContract } from "configs/contracts";
import { TokensData } from "types/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "types/trade";
import { bigMath } from "utils/bigmath";
import { BASIS_POINTS_DIVISOR_BIGINT, getBasisPoints } from "utils/numbers";
import { AVAILABLE_BOTANIX_DEPOSIT_PAIRS, AVAILABLE_BOTANIX_WITHDRAW_PAIRS } from "utils/swap/externalSwapPath";
import { convertToUsd, getMidPrice, getTokenData } from "utils/tokens";

const COEF_REDUCER = getBasisPoints(1n, 10000n);

export const getBotanixStakingExternalSwapQuote = ({
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  gasPrice,
  receiverAddress,
  tokensData,
  assetsPerShare,
}: {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  gasPrice: bigint;
  receiverAddress: string;
  tokensData: TokensData;
  assetsPerShare: bigint;
}): ExternalSwapQuote | undefined => {
  const inTokenData = getTokenData(tokensData, tokenInAddress);
  const outTokenData = getTokenData(tokensData, tokenOutAddress);

  const assetsPerShareRate = getBasisPoints(assetsPerShare, 10n ** 18n) - COEF_REDUCER;
  const sharesPerAssetRate = getBasisPoints(10n ** 18n, assetsPerShare) - COEF_REDUCER;

  if (!inTokenData || !outTokenData) {
    return undefined;
  }

  if (AVAILABLE_BOTANIX_DEPOSIT_PAIRS.some((pair) => pair.from === tokenInAddress && pair.to === tokenOutAddress)) {
    const priceIn = getMidPrice(inTokenData.prices);
    const priceOut = bigMath.mulDiv(priceIn, sharesPerAssetRate, BASIS_POINTS_DIVISOR_BIGINT);
    const usdIn = convertToUsd(amountIn, inTokenData.decimals, priceIn);
    const amountOut =
      amountIn > 0n ? bigMath.mulDiv(amountIn, sharesPerAssetRate, BASIS_POINTS_DIVISOR_BIGINT) - gasPrice : 0n;
    const usdOut = amountOut > 0n ? convertToUsd(amountOut, outTokenData.decimals, priceOut) : 0n;
    return {
      aggregator: ExternalSwapAggregator.BotanixStaking,
      inTokenAddress: tokenInAddress,
      outTokenAddress: tokenOutAddress,
      receiver: receiverAddress,
      amountIn,
      amountOut,
      usdIn: usdIn!,
      usdOut: usdOut!,
      priceIn,
      priceOut,
      feesUsd: gasPrice,
      needSpenderApproval: true,
      txnData: {
        to: getContract(BOTANIX, "StBTC"),
        data: encodeFunctionData({
          abi: StBTCABI,
          functionName: "deposit",
          args: [amountIn, receiverAddress],
        }),
        value: 0n,
        estimatedGas: gasPrice,
        estimatedExecutionFee: gasPrice,
      },
    };
  }

  if (AVAILABLE_BOTANIX_WITHDRAW_PAIRS.some((pair) => pair.from === tokenInAddress && pair.to === tokenOutAddress)) {
    const priceIn = getMidPrice(inTokenData.prices);
    const priceOut = bigMath.mulDiv(priceIn, assetsPerShareRate, BASIS_POINTS_DIVISOR_BIGINT);
    const usdIn = convertToUsd(amountIn, inTokenData.decimals, priceIn);
    const amountOut =
      amountIn > 0n ? bigMath.mulDiv(amountIn, assetsPerShareRate, BASIS_POINTS_DIVISOR_BIGINT) - gasPrice : 0n;
    const usdOut = amountOut > 0n ? convertToUsd(amountOut, outTokenData.decimals, priceOut) : 0n;

    return {
      aggregator: ExternalSwapAggregator.BotanixStaking,
      inTokenAddress: tokenInAddress,
      outTokenAddress: tokenOutAddress,
      receiver: receiverAddress,
      amountIn,
      amountOut,
      usdIn: usdIn!,
      usdOut: usdOut!,
      priceIn,
      priceOut,
      feesUsd: gasPrice,
      needSpenderApproval: true,
      txnData: {
        to: getContract(BOTANIX, "StBTC"),
        data: encodeFunctionData({
          abi: StBTCABI,
          functionName: "withdraw",
          args: [amountIn, receiverAddress, getContract(BOTANIX, "ExternalHandler")],
        }),
        value: 0n,
        estimatedGas: gasPrice,
        estimatedExecutionFee: gasPrice,
      },
    };
  }
};

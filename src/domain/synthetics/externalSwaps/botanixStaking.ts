import { encodeFunctionData } from "viem";

import { getMidPrice } from "domain/tokens";
import { BASIS_POINTS_DIVISOR_BIGINT, getBasisPoints } from "lib/numbers";
import StBTCABI from "sdk/abis/StBTC.json";
import { BOTANIX } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/types/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";

import { convertToUsd, getTokenData } from "../tokens";

const BBTC_ADDRESS = NATIVE_TOKEN_ADDRESS;
const PBTC_ADDRESS = getTokenBySymbol(BOTANIX, "PBTC").address;
const STBTC_ADDRESS = getTokenBySymbol(BOTANIX, "STBTC").address;
const AVAILABLE_BOTANIX_DEPOSIT_PAIRS = [
  {
    from: BBTC_ADDRESS,
    to: STBTC_ADDRESS,
  },
  {
    from: PBTC_ADDRESS,
    to: STBTC_ADDRESS,
  },
];

const AVAILABLE_BOTANIX_WITHDRAW_PAIRS = [
  {
    from: STBTC_ADDRESS,
    to: PBTC_ADDRESS,
  },
];

const COEF_REDUCER = getBasisPoints(1n, 10000n);

export const getBotanixStakingExternalSwapQuota = ({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  gasPrice,
  receiverAddress,
  tokensData,
  assetsPerShare,
}: {
  chainId: number;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  gasPrice: bigint;
  receiverAddress: string;
  tokensData: TokensData;
  assetsPerShare: bigint;
}): ExternalSwapQuote | undefined => {
  if (chainId === BOTANIX) {
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
      const amountOut = bigMath.mulDiv(amountIn, sharesPerAssetRate, BASIS_POINTS_DIVISOR_BIGINT) - gasPrice;
      const usdOut = convertToUsd(amountOut, outTokenData.decimals, priceOut);
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
            abi: StBTCABI.abi,
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
      const amountOut = bigMath.mulDiv(amountIn, assetsPerShareRate, BASIS_POINTS_DIVISOR_BIGINT) - gasPrice;
      const usdOut = convertToUsd(amountOut, outTokenData.decimals, priceOut);

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
            abi: StBTCABI.abi,
            functionName: "withdraw",
            args: [amountIn, receiverAddress, getContract(BOTANIX, "ExternalHandler")],
          }),
          value: 0n,
          estimatedGas: gasPrice,
          estimatedExecutionFee: gasPrice,
        },
      };
    }
  }
};

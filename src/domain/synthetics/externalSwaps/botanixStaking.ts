import { encodeFunctionData } from "viem";

import StBTCABI from "sdk/abis/StBTC.json";
import { BOTANIX } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/types/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/types/trade";

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

export const getBotanixStakingExternalSwapQuota = ({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  gasPrice,
  receiverAddress,
  tokensData,
}: {
  chainId: number;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  gasPrice: bigint;
  receiverAddress: string;
  tokensData: TokensData;
}): ExternalSwapQuote | undefined => {
  if (chainId === BOTANIX) {
    const inTokenData = getTokenData(tokensData, tokenInAddress);
    if (inTokenData && AVAILABLE_BOTANIX_DEPOSIT_PAIRS.some((pair) => pair.from === tokenInAddress && pair.to === tokenOutAddress)) {
      const usdIn = convertToUsd(amountIn, inTokenData.decimals, inTokenData.prices.minPrice);
      return {
        aggregator: ExternalSwapAggregator.BotanixStaking,
        inTokenAddress: tokenInAddress,
        outTokenAddress: tokenOutAddress,
        receiver: receiverAddress,
        amountIn,
        amountOut: amountIn,
        usdIn: usdIn!,
        usdOut: usdIn! - gasPrice,
        priceIn: 0n,
        priceOut: 0n,
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

    if (inTokenData && AVAILABLE_BOTANIX_WITHDRAW_PAIRS.some((pair) => pair.from === tokenInAddress && pair.to === tokenOutAddress)) {
      const usdIn = convertToUsd(amountIn, inTokenData.decimals, inTokenData.prices.minPrice);
      return {
        aggregator: ExternalSwapAggregator.BotanixStaking,
        inTokenAddress: tokenInAddress,
        outTokenAddress: tokenOutAddress,
        receiver: receiverAddress,
        amountIn,
        amountOut: amountIn,
        usdIn: usdIn!,
        usdOut: usdIn! - gasPrice,
        priceIn: 0n,
        priceOut: 0n,
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

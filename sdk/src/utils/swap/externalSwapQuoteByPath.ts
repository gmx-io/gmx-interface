import { ExternalSwapAggregator, ExternalSwapPath, ExternalSwapQuote, ExternalSwapQuoteParams } from "types/trade";

import { getBotanixStakingExternalSwapQuote } from "./botanixStaking";

export const getExternalSwapQuoteByPath = ({
  amountIn,
  externalSwapPath,
  externalSwapQuoteParams,
}: {
  amountIn: bigint;
  externalSwapPath: ExternalSwapPath;
  externalSwapQuoteParams: ExternalSwapQuoteParams;
}): ExternalSwapQuote | undefined => {
  if (
    amountIn === undefined ||
    externalSwapQuoteParams.gasPrice === undefined ||
    externalSwapQuoteParams.tokensData === undefined ||
    externalSwapQuoteParams.botanixStakingAssetsPerShare === undefined ||
    externalSwapQuoteParams.receiverAddress === undefined
  ) {
    return undefined;
  }

  if (externalSwapPath.aggregator === ExternalSwapAggregator.BotanixStaking) {
    return getBotanixStakingExternalSwapQuote({
      tokenInAddress: externalSwapPath.inTokenAddress,
      tokenOutAddress: externalSwapPath.outTokenAddress,
      amountIn,
      gasPrice: externalSwapQuoteParams.gasPrice,
      receiverAddress: externalSwapQuoteParams.receiverAddress,
      tokensData: externalSwapQuoteParams.tokensData,
      assetsPerShare: externalSwapQuoteParams.botanixStakingAssetsPerShare,
    });
  }

  return undefined;
};

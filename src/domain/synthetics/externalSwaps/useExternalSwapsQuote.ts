import { getByKey } from "lib/objects";
import { useDebounce } from "lib/useDebounce";
import { useMemo } from "react";
import { getContract } from "sdk/configs/contracts";
import { TokenData, TokensData } from "sdk/types/tokens";
import useSWR from "swr";
import { convertToUsd } from "../tokens";
import { getOpenOceanPriceQuote, getOpenOceanTxnData } from "./openOcean";
import { ExternalSwapAggregator, ExternalSwapOutput, ExternalSwapQuote } from "sdk/types/trade";

export function useExternalSwapsQuote({
  chainId,
  tokensData,
  fromTokenAddress,
  toTokenAddress,
  fromTokenAmount,
  receiverAddress,
  slippage,
  gasPrice,
  enabled = true,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  fromTokenAmount: bigint | undefined;
  slippage: number | undefined;
  gasPrice: bigint | undefined;
  receiverAddress: string | undefined;
  enabled?: boolean;
}) {
  const swapKey =
    enabled &&
    fromTokenAddress &&
    toTokenAddress &&
    toTokenAddress !== fromTokenAddress &&
    fromTokenAmount !== undefined &&
    fromTokenAmount > 0n &&
    slippage !== undefined &&
    gasPrice !== undefined
      ? [
          "useExternalSwapsQuote",
          chainId,
          fromTokenAddress,
          toTokenAddress,
          fromTokenAmount,
          slippage,
          gasPrice,
          receiverAddress,
        ]
      : null;

  const debouncedKey = useDebounce(swapKey, 500);

  const { data: externalSwapOutput } = useSWR(debouncedKey, {
    keepPreviousData: true,

    fetcher: async () => {
      try {
        if (
          !fromTokenAddress ||
          !toTokenAddress ||
          fromTokenAmount === undefined ||
          slippage === undefined ||
          gasPrice === undefined
        ) {
          throw new Error("Invalid swap parameters");
        }

        let quote: ExternalSwapOutput;

        if (receiverAddress) {
          const result = await getOpenOceanTxnData({
            chainId,
            senderAddress: getContract(chainId, "ExternalHandler"),
            receiverAddress,
            tokenInAddress: fromTokenAddress,
            tokenOutAddress: toTokenAddress,
            tokenInAmount: fromTokenAmount,
            gasPrice: gasPrice.toString(),
            slippage,
          });

          if (!result) {
            throw new Error("Failed to fetch open ocean txn data");
          }

          quote = {
            aggregator: ExternalSwapAggregator.OpenOcean,
            fromTokenAddress,
            toTokenAddress,
            fromTokenAmount,
            outputAmount: result.outputAmount,
            txnData: {
              to: result.to,
              data: result.data,
              value: result.value,
              estimatedGas: result.estimatedGas,
            },
          };
        } else {
          const openOceanQuote = await getOpenOceanPriceQuote({
            chainId,
            fromTokenAddress,
            toTokenAddress,
            fromTokenAmount,
            slippage,
            gasPrice,
          });

          if (!openOceanQuote) {
            throw new Error("Failed to fetch external swap quote");
          }

          quote = {
            aggregator: ExternalSwapAggregator.OpenOcean,
            fromTokenAddress,
            toTokenAddress,
            fromTokenAmount,
            outputAmount: openOceanQuote.outAmount,
          };
        }

        return quote;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching external swap quote", error);
        throw error;
      }
    },
  });

  return useMemo(() => {
    const fromToken = getByKey(tokensData, fromTokenAddress);
    const toToken = getByKey(tokensData, toTokenAddress);

    if (!fromToken || !toToken || !externalSwapOutput || fromTokenAmount === undefined) {
      return {};
    }

    const inPrice = fromToken.prices.minPrice;
    const outPrice = toToken.prices.maxPrice;

    const fromTokenUsd = convertToUsd(fromTokenAmount, fromToken.decimals, inPrice)!;
    const toTokenUsd = convertToUsd(externalSwapOutput.outputAmount, toToken.decimals, outPrice)!;

    const externalSwapFees = estimateExternalSwapFees({
      fromToken,
      toToken,
      fromTokenAmount,
      toTokenAmount: externalSwapOutput.outputAmount,
    });

    const externalSwapQuote: ExternalSwapQuote = {
      ...externalSwapOutput,
      ...externalSwapFees,
      fromTokenUsd,
      outputUsd: toTokenUsd,
      slippage,
    };

    return {
      externalSwapQuote,
    };
  }, [externalSwapOutput, fromTokenAddress, fromTokenAmount, slippage, toTokenAddress, tokensData]);
}

function estimateExternalSwapFees({
  fromToken,
  toToken,
  fromTokenAmount,
  toTokenAmount,
}: {
  fromToken: TokenData;
  toToken: TokenData;
  fromTokenAmount: bigint;
  toTokenAmount: bigint;
}) {
  const fromTokenUsd = convertToUsd(fromTokenAmount, fromToken.decimals, fromToken.prices.minPrice)!;
  const toTokenUsd = convertToUsd(toTokenAmount, toToken.decimals, toToken.prices.minPrice)!;

  const feesUsd = fromTokenUsd - toTokenUsd;

  return {
    feesUsd,
  };
}

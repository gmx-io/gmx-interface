import { getByKey } from "lib/objects";
import { useDebounce } from "lib/useDebounce";
import { useMemo } from "react";
import { TokenData, TokensData } from "sdk/types/tokens";
import useSWR from "swr";
import { convertToUsd } from "../tokens";
import { getOpenOceanPriceQuote } from "./openOcean";
import useWallet from "lib/wallets/useWallet";

export enum ExternalSwapAggregator {
  OpenOcean = "openOcean",
}

export type ExternalSwapOutput = {
  aggregator: ExternalSwapAggregator;
  outputAmount: bigint;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount: bigint;
};

export type ExternalSwapFees = {
  feesUsd: bigint;
};

export type ExternalSwapQuote = ExternalSwapOutput & {
  fromTokenUsd: bigint;
  outputUsd: bigint;
  feesUsd: bigint;
  slippage: number;
};

export function estimateExternalSwapFees({
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

export function useExternalSwapsQuote({
  chainId,
  tokensData,
  fromTokenAddress,
  toTokenAddress,
  fromTokenAmount,
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
  enabled?: boolean;
}) {
  const { signer } = useWallet();

  console.log("signer address", signer?.address);

  const swapKey =
    enabled &&
    fromTokenAddress &&
    toTokenAddress &&
    toTokenAddress !== fromTokenAddress &&
    fromTokenAmount !== undefined &&
    fromTokenAmount > 0n &&
    slippage !== undefined &&
    gasPrice !== undefined
      ? ["useExternalSwapsQuote", chainId, fromTokenAddress, toTokenAddress, fromTokenAmount, slippage, gasPrice]
      : null;

  const debouncedKey = useDebounce(swapKey, 500);

  console.log("debouncedKey", debouncedKey, [
    "useExternalSwapsQuote",
    chainId,
    fromTokenAddress,
    toTokenAddress,
    fromTokenAmount?.toString(),
    slippage,
    gasPrice,
  ]);

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

        console.log("gasPrice", gasPrice);

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

        const result: ExternalSwapOutput = {
          aggregator: ExternalSwapAggregator.OpenOcean,
          fromTokenAddress,
          toTokenAddress,
          fromTokenAmount,
          outputAmount: openOceanQuote.outAmount,
        };

        return result;
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

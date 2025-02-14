import { useDebounce } from "lib/useDebounce";
import { useMemo } from "react";
import { getContract } from "sdk/configs/contracts";
import { TokensData } from "sdk/types/tokens";
import { ExternalSwapAggregator, ExternalSwapOutput } from "sdk/types/trade";
import useSWR from "swr";
import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getOpenOceanTxnData } from "./openOcean";

export function useExternalSwapOutputRequest({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  slippage,
  gasPrice,
  enabled = true,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  tokenInAddress: string | undefined;
  tokenOutAddress: string | undefined;
  amountIn: bigint | undefined;
  slippage: number | undefined;
  gasPrice: bigint | undefined;
  enabled?: boolean;
}) {
  const swapKey =
    enabled &&
    tokenInAddress &&
    tokenOutAddress &&
    tokenOutAddress !== tokenInAddress &&
    amountIn !== undefined &&
    amountIn > 0n &&
    slippage !== undefined &&
    gasPrice !== undefined
      ? ["useExternalSwapsQuote", chainId, tokenInAddress, tokenOutAddress, amountIn, slippage, gasPrice]
      : null;

  const debouncedKey = useDebounce(swapKey, 300);

  const { data } = useSWR(debouncedKey, {
    keepPreviousData: true,

    fetcher: async () => {
      try {
        if (
          !tokenInAddress ||
          !tokenOutAddress ||
          amountIn === undefined ||
          slippage === undefined ||
          gasPrice === undefined
        ) {
          throw new Error("Invalid swap parameters");
        }

        const result = await getOpenOceanTxnData({
          chainId,
          senderAddress: getContract(chainId, "ExternalHandler"),
          receiverAddress: getContract(chainId, "OrderVault"),
          tokenInAddress,
          tokenOutAddress,
          amountIn,
          gasPrice,
          slippage,
        });

        if (!result) {
          throw new Error("Failed to fetch open ocean txn data");
        }

        const quote: ExternalSwapOutput = {
          aggregator: ExternalSwapAggregator.OpenOcean,
          inTokenAddress: tokenInAddress,
          outTokenAddress: tokenOutAddress,
          amountIn,
          amountOut: result.outputAmount,
          txnData: {
            to: result.to,
            data: result.data,
            value: result.value,
            estimatedGas: result.estimatedGas,
          },
        };

        return quote;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching external swap quote", error);
        throw error;
      }
    },
  });

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: data?.txnData?.to,
    tokenAddresses: tokenInAddress ? [tokenInAddress] : [],
  });

  return useMemo(() => {
    if (!data || amountIn === undefined) {
      return {};
    }

    const needSpenderApproval = getNeedTokenApprove(tokensAllowanceData, tokenInAddress, amountIn);

    const externalSwapOutput: ExternalSwapOutput = {
      ...data,
      needSpenderApproval,
    };

    return {
      externalSwapOutput,
    };
  }, [data, amountIn, tokensAllowanceData, tokenInAddress]);
}

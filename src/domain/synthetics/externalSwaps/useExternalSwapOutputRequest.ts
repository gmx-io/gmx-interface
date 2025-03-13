import { sleep } from "lib/sleep";
import { useDebounce } from "lib/useDebounce";
import { useMemo } from "react";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress, getTokenBySymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/types/tokens";
import { ExternalSwapAggregator, ExternalSwapOutput } from "sdk/types/trade";
import useSWR from "swr";
import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getOpenOceanTxnData } from "./openOcean";
import { usePrevious } from "react-use";
import { parseUnits } from "ethers";

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
      ? `useExternalSwapsQuote:${chainId}:${tokenInAddress}:${tokenOutAddress}:${amountIn}:${slippage}:${gasPrice}`
      : null;

  const debouncedKey = useDebounce(swapKey, 300);
  const tokensKey = `${tokenInAddress}:${tokenOutAddress};`;
  const prevTokensKey = usePrevious(tokensKey);
  const prevAmountIn = usePrevious(amountIn);

  const key = "true";

  const { data } = useSWR<{ quote: ExternalSwapOutput; requestKey: string }>(key, {
    keepPreviousData: enabled && prevTokensKey === tokensKey && prevAmountIn === amountIn,
    fetcher: async (requestKey: string) => {
      try {
        // if (
        //   !tokenInAddress ||
        //   !tokenOutAddress ||
        //   amountIn === undefined ||
        //   slippage === undefined ||
        //   gasPrice === undefined
        // ) {
        //   throw new Error("Invalid swap parameters");
        // }

        const result = await Promise.race([
          getOpenOceanTxnData({
            chainId,
            senderAddress: getContract(chainId, "ExternalHandler"),
            receiverAddress: getContract(chainId, "GelatoRelayRouter"),
            tokenInAddress: getTokenBySymbol(chainId, "USDC")?.address,
            tokenOutAddress: getTokenBySymbol(chainId, "WETH")?.address,
            amountIn: parseUnits("1", 6),
            gasPrice: parseUnits("1", 18),
            slippage: 1,
          }),
          sleep(5000).then(() => {
            throw new Error("External swap request timeout");
          }),
        ]);

        console.log("result", result);

        if (!result) {
          throw new Error("Failed to fetch open ocean txn data");
        }

        const quote: ExternalSwapOutput = {
          aggregator: ExternalSwapAggregator.OpenOcean,
          inTokenAddress: getTokenBySymbol(chainId, "USDC")?.address,
          outTokenAddress: getTokenBySymbol(chainId, "WETH")?.address,
          amountIn: parseUnits("1", 6),
          amountOut: result.outputAmount,
          usdIn: result.usdIn,
          usdOut: result.usdOut,
          priceIn: result.priceIn,
          priceOut: result.priceOut,
          feesUsd: result.usdIn !== undefined && result.usdOut !== undefined ? result.usdIn - result.usdOut : undefined,
          txnData: {
            to: result.to,
            data: result.data,
            value: result.value,
            estimatedGas: result.estimatedGas,
          },
        };

        return {
          quote,
          requestKey,
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching external swap quote", error);
        throw error;
      }
    },
  });

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: data?.quote?.txnData?.to,
    tokenAddresses: tokenInAddress ? [convertTokenAddress(chainId, tokenInAddress, "wrapped")] : [],
  });

  return useMemo(() => {
    if (!tokenInAddress || !data || amountIn === undefined) {
      return {};
    }

    const needSpenderApproval = getNeedTokenApprove(
      tokensAllowanceData,
      convertTokenAddress(chainId, tokenInAddress, "wrapped"),
      amountIn
    );

    const externalSwapOutput: ExternalSwapOutput = {
      ...data.quote,
      needSpenderApproval,
    };

    return {
      externalSwapOutput,
    };
  }, [tokenInAddress, data, amountIn, tokensAllowanceData, chainId]);
}

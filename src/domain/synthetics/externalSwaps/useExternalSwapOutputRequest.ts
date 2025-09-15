import { useMemo } from "react";
import { usePrevious } from "react-use";
import useSWR from "swr";

import { BOTANIX } from "config/chains";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectBotanixStakingAssetsPerShare } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useDebounce } from "lib/debounce/useDebounce";
import { metrics, OpenOceanQuoteTiming } from "lib/metrics";
import { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/types/trade";
import { getBotanixStakingExternalSwapQuote } from "sdk/utils/swap/botanixStaking";

import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getOpenOceanTxnData, OpenOceanQuote } from "./openOcean";

export function useExternalSwapOutputRequest({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  receiverAddress,
  amountIn,
  slippage,
  gasPrice,
  enabled = true,
}: {
  chainId: ContractsChainId;
  tokenInAddress: string | undefined;
  tokenOutAddress: string | undefined;
  receiverAddress: string | undefined;
  amountIn: bigint | undefined;
  slippage: number | undefined;
  gasPrice: bigint | undefined;
  enabled?: boolean;
}) {
  const swapKey =
    enabled &&
    tokenInAddress &&
    tokenOutAddress &&
    receiverAddress &&
    tokenOutAddress !== tokenInAddress &&
    amountIn !== undefined &&
    amountIn > 0n &&
    slippage !== undefined &&
    gasPrice !== undefined
      ? `useExternalSwapsQuote:${chainId}:${tokenInAddress}:${tokenOutAddress}:${amountIn}:${slippage}:${gasPrice}:${receiverAddress}`
      : null;

  const debouncedKey = useDebounce(swapKey, 300);
  const tokensKey = `${tokenInAddress}:${tokenOutAddress};`;
  const prevTokensKey = usePrevious(tokensKey);
  const prevAmountIn = usePrevious(amountIn);
  const botanixAssetsPerShare = useSelector(selectBotanixStakingAssetsPerShare);

  const { data } = useSWR<OpenOceanQuote | undefined>(debouncedKey, {
    keepPreviousData: enabled && prevTokensKey === tokensKey && prevAmountIn === amountIn,
    fetcher: async () => {
      try {
        if (
          !tokenInAddress ||
          !tokenOutAddress ||
          !receiverAddress ||
          amountIn === undefined ||
          slippage === undefined ||
          gasPrice === undefined
        ) {
          throw new Error("Invalid swap parameters");
        }

        const startTime = Date.now();

        if (chainId === BOTANIX) {
          return undefined;
        }

        const result = await getOpenOceanTxnData({
          chainId,
          senderAddress: getContract(chainId, "ExternalHandler"),
          receiverAddress,
          tokenInAddress,
          tokenOutAddress,
          amountIn,
          gasPrice,
          slippage,
        });

        metrics.pushTiming<OpenOceanQuoteTiming>("openOcean.quote.timing", Date.now() - startTime);

        if (!result) {
          throw new Error("Failed to fetch open ocean txn data");
        }

        return result;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching external swap quote", error);
        metrics.pushError(error, "externalSwap.useExternalSwapOutputRequest");
        throw error;
      }
    },
  });

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: data?.to,
    tokenAddresses: tokenInAddress ? [convertTokenAddress(chainId, tokenInAddress, "wrapped")] : [],
  });

  const tokensData = useTokensData();

  return useMemo(() => {
    if (amountIn === undefined || !tokenInAddress || !tokenOutAddress || gasPrice === undefined || !receiverAddress) {
      return {};
    }

    const botanixStakingQuote =
      tokensData && botanixAssetsPerShare !== undefined && chainId === BOTANIX
        ? getBotanixStakingExternalSwapQuote({
            tokenInAddress,
            tokenOutAddress,
            amountIn,
            gasPrice,
            receiverAddress,
            tokensData,
            assetsPerShare: botanixAssetsPerShare,
          })
        : undefined;

    if (botanixStakingQuote) {
      return {
        quote: botanixStakingQuote,
      };
    }

    if (!data) {
      return {};
    }

    const needSpenderApproval = getNeedTokenApprove(
      tokensAllowanceData,
      convertTokenAddress(chainId, tokenInAddress, "wrapped"),
      data.amountIn,
      []
    );

    const quote: ExternalSwapQuote = {
      aggregator: ExternalSwapAggregator.OpenOcean,
      inTokenAddress: tokenInAddress,
      outTokenAddress: tokenOutAddress,
      receiver: receiverAddress,
      amountIn: data.amountIn,
      amountOut: data.outputAmount,
      usdIn: data.usdIn,
      usdOut: data.usdOut,
      priceIn: data.priceIn,
      priceOut: data.priceOut,
      feesUsd: data.usdIn - data.usdOut,
      needSpenderApproval,
      txnData: {
        to: data.to,
        data: data.data,
        value: data.value,
        estimatedGas: data.estimatedGas,
        estimatedExecutionFee: data.estimatedGas * gasPrice,
      },
    };

    return {
      quote,
    };
  }, [
    amountIn,
    tokenInAddress,
    tokenOutAddress,
    gasPrice,
    receiverAddress,
    tokensData,
    botanixAssetsPerShare,
    chainId,
    data,
    tokensAllowanceData,
  ]);
}

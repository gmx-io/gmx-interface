import { useEffect, useMemo, useState } from "react";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { useSavedAllowedSlippage } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { getOpenOceanTxnData } from "domain/synthetics/externalSwaps/openOcean";
import { useGasPrice } from "domain/synthetics/fees/useGasPrice";
import { convertToUsd } from "domain/synthetics/tokens";
import { metrics } from "lib/metrics";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress, getToken, getTokenBySymbol } from "sdk/configs/tokens";
import { type ExternalCallsPayload, combineExternalCalls, getExternalCallsPayload } from "sdk/utils/orderTransactions";
import type { Token, TokensData } from "sdk/utils/tokens/types";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/utils/trade/types";

import type { SelectedClaimTokenAmount } from "./useClaimAffiliateRewardsSelection";

export type SwapTargetTokenOption = {
  token: Token;
};

type ClaimSwapRouteResult = {
  quotes: ExternalSwapQuote[];
  failedTokenAddresses: string[];
  estimatedExecutionFee: bigint;
  usdOut: bigint;
};

const SWAP_TARGET_TOKEN_OPTIONS_BY_CHAIN: Partial<Record<ContractsChainId, string[]>> = {
  [ARBITRUM]: [
    getTokenBySymbol(ARBITRUM, "GMX").address,
    getTokenBySymbol(ARBITRUM, "USDC").address,
    getTokenBySymbol(ARBITRUM, "WETH").address,
    getTokenBySymbol(ARBITRUM, "BTC").address,
  ],
  [AVALANCHE]: [
    getTokenBySymbol(AVALANCHE, "USDC").address,
    getTokenBySymbol(AVALANCHE, "WAVAX").address,
    getTokenBySymbol(AVALANCHE, "BTC").address,
  ],
};

function getSwapTargetTokenOptions(chainId: ContractsChainId): SwapTargetTokenOption[] {
  const tokenAddresses = SWAP_TARGET_TOKEN_OPTIONS_BY_CHAIN[chainId] ?? [];

  return tokenAddresses.map((tokenAddress) => ({ token: getToken(chainId, tokenAddress) }));
}

function buildSwapExternalCallsPayload({
  chainId,
  quotes,
  refundReceiver,
}: {
  chainId: ContractsChainId;
  quotes: ExternalSwapQuote[];
  refundReceiver: string;
}): ExternalCallsPayload {
  return combineExternalCalls(
    quotes.map((quote) =>
      getExternalCallsPayload({
        chainId,
        account: refundReceiver,
        quote,
      })
    )
  );
}

export function useClaimAffiliateSwapRoutes({
  account,
  chainId,
  selectedClaimTokenAmountsByToken,
  tokensData,
}: {
  account: string | undefined;
  chainId: ContractsChainId;
  selectedClaimTokenAmountsByToken: Record<string, SelectedClaimTokenAmount>;
  tokensData: TokensData | undefined;
}) {
  const gasPrice = useGasPrice(chainId);
  const allowedSlippage = useSavedAllowedSlippage();

  const swapTargetTokenOptions = useMemo(() => getSwapTargetTokenOptions(chainId), [chainId]);
  const [isSwapEnabled, setIsSwapEnabled] = useState(false);
  const [swapTargetTokenAddress, setSwapTargetTokenAddress] = useState<string | undefined>(
    swapTargetTokenOptions[0]?.token.address
  );

  useEffect(() => {
    if (
      swapTargetTokenOptions.length > 0 &&
      (!swapTargetTokenAddress ||
        !swapTargetTokenOptions.some((option) => option.token.address === swapTargetTokenAddress))
    ) {
      setSwapTargetTokenAddress(swapTargetTokenOptions[0].token.address);
    }
  }, [swapTargetTokenAddress, swapTargetTokenOptions]);

  const swapTargetToken = swapTargetTokenAddress ? getByKey(tokensData, swapTargetTokenAddress) : undefined;

  const selectedClaimTokenAmounts = useMemo(
    () => Object.values(selectedClaimTokenAmountsByToken),
    [selectedClaimTokenAmountsByToken]
  );

  const tokensToSwap = useMemo(() => {
    if (!swapTargetTokenAddress) {
      return [] as SelectedClaimTokenAmount[];
    }

    return selectedClaimTokenAmounts.filter(
      (item) => item.tokenAddress !== swapTargetTokenAddress && item.amount > 0n
    ) as SelectedClaimTokenAmount[];
  }, [selectedClaimTokenAmounts, swapTargetTokenAddress]);

  // This amount is already in the selected target token, so no swap is needed for it.
  const alreadyInTargetTokenAmount = swapTargetTokenAddress
    ? selectedClaimTokenAmountsByToken[swapTargetTokenAddress]?.amount ?? 0n
    : 0n;
  const alreadyInTargetTokenUsd = swapTargetTokenAddress
    ? selectedClaimTokenAmountsByToken[swapTargetTokenAddress]?.usd ?? 0n
    : 0n;

  const swapRouteEstimationKey = useMemo(() => {
    if (!isSwapEnabled || swapTargetTokenAddress === undefined || tokensToSwap.length === 0) {
      return undefined;
    }

    const sortedTokensToSwap = [...tokensToSwap]
      .map((item) => `${item.tokenAddress}:${item.amount.toString()}`)
      .sort()
      .join("|");

    return `${chainId}:${swapTargetTokenAddress}:${sortedTokensToSwap}`;
  }, [chainId, isSwapEnabled, swapTargetTokenAddress, tokensToSwap]);

  const previousSwapRouteEstimationKey = usePrevious(swapRouteEstimationKey);
  const forceRecalculate =
    swapRouteEstimationKey !== undefined && swapRouteEstimationKey !== previousSwapRouteEstimationKey;

  const swapRouteParams = useMemo(() => {
    if (
      !swapRouteEstimationKey ||
      swapTargetTokenAddress === undefined ||
      gasPrice === undefined ||
      allowedSlippage === undefined
    ) {
      return undefined;
    }

    return {
      chainId,
      swapTargetTokenAddress,
      tokensToSwap,
      gasPrice,
      allowedSlippage,
    };
  }, [allowedSlippage, chainId, gasPrice, swapRouteEstimationKey, swapTargetTokenAddress, tokensToSwap]);

  const swapRouteAsyncResult = useThrottledAsync<
    ClaimSwapRouteResult,
    {
      chainId: ContractsChainId;
      swapTargetTokenAddress: string;
      tokensToSwap: SelectedClaimTokenAmount[];
      gasPrice: bigint;
      allowedSlippage: number;
    }
  >(
    async ({ params }) => {
      const externalHandlerAddress = getContract(params.chainId, "ExternalHandler");
      const client = getPublicClientWithRpc(params.chainId);

      const quoteResults = await Promise.all(
        params.tokensToSwap.map(async (tokenToSwap) => {
          const quoteData = await getOpenOceanTxnData({
            chainId: params.chainId,
            senderAddress: externalHandlerAddress,
            receiverAddress: externalHandlerAddress,
            tokenInAddress: tokenToSwap.tokenAddress,
            tokenOutAddress: params.swapTargetTokenAddress,
            amountIn: tokenToSwap.amount,
            gasPrice: params.gasPrice,
            slippage: params.allowedSlippage,
          });

          if (!quoteData) {
            return {
              tokenAddress: tokenToSwap.tokenAddress,
              quote: undefined as ExternalSwapQuote | undefined,
            };
          }

          let needSpenderApproval = true;
          try {
            const allowance = await client.readContract({
              address: convertTokenAddress(params.chainId, tokenToSwap.tokenAddress, "wrapped"),
              abi: abis.ERC20,
              functionName: "allowance",
              args: [externalHandlerAddress, quoteData.to],
            });
            needSpenderApproval = allowance < tokenToSwap.amount;
          } catch (error) {
            metrics.pushError(error, "claimAffiliateRewards.swap.allowance");
          }

          const quote: ExternalSwapQuote = {
            aggregator: ExternalSwapAggregator.OpenOcean,
            inTokenAddress: tokenToSwap.tokenAddress,
            outTokenAddress: params.swapTargetTokenAddress,
            receiver: externalHandlerAddress,
            amountIn: tokenToSwap.amount,
            amountOut: quoteData.outputAmount,
            usdIn: quoteData.usdIn,
            usdOut: quoteData.usdOut,
            priceIn: quoteData.priceIn,
            priceOut: quoteData.priceOut,
            feesUsd: quoteData.usdIn - quoteData.usdOut,
            needSpenderApproval,
            txnData: {
              to: quoteData.to,
              data: quoteData.data,
              value: quoteData.value,
              estimatedGas: quoteData.estimatedGas,
              estimatedExecutionFee: quoteData.estimatedGas * params.gasPrice,
            },
          };

          return {
            tokenAddress: tokenToSwap.tokenAddress,
            quote,
          };
        })
      );

      const quotes = quoteResults.flatMap((result) => (result.quote ? [result.quote] : []));
      const failedTokenAddresses = quoteResults.flatMap((result) => (result.quote ? [] : [result.tokenAddress]));

      return {
        quotes,
        failedTokenAddresses,
        estimatedExecutionFee: quotes.reduce((acc, quote) => acc + quote.txnData.estimatedExecutionFee, 0n),
        usdOut: quotes.reduce((acc, quote) => acc + quote.usdOut, 0n),
      };
    },
    {
      withLoading: false,
      throttleMs: 10_000,
      leading: false,
      trailing: true,
      params: swapRouteParams,
      forceRecalculate,
      resetOnForceRecalculate: true,
    }
  );

  const swapRouteData = swapRouteAsyncResult.data;
  const failedSwapTokenAddresses = useMemo(
    () => (forceRecalculate ? [] : swapRouteData?.failedTokenAddresses ?? []),
    [forceRecalculate, swapRouteData]
  );
  const hasSwapRouteError =
    !forceRecalculate && (swapRouteAsyncResult.error !== undefined || failedSwapTokenAddresses.length > 0);
  const isSwapRouteLoading =
    swapRouteParams !== undefined && !hasSwapRouteError && (forceRecalculate || !swapRouteData);
  const isSwapRouteReady =
    !isSwapEnabled ||
    tokensToSwap.length === 0 ||
    (!forceRecalculate && !!swapRouteData && !hasSwapRouteError && swapRouteData.quotes.length === tokensToSwap.length);

  const settlementSwapExternalCalls = useMemo(() => {
    if (!account || !isSwapEnabled || !isSwapRouteReady || tokensToSwap.length === 0) {
      return undefined;
    }

    return buildSwapExternalCallsPayload({
      chainId,
      quotes: swapRouteData!.quotes,
      refundReceiver: account,
    });
  }, [account, chainId, isSwapEnabled, isSwapRouteReady, swapRouteData, tokensToSwap.length]);

  const multichainSwapExternalCalls = useMemo(() => {
    if (!isSwapEnabled || !isSwapRouteReady || tokensToSwap.length === 0) {
      return undefined;
    }

    return buildSwapExternalCallsPayload({
      chainId,
      quotes: swapRouteData!.quotes,
      refundReceiver: getContract(chainId, "MultichainVault"),
    });
  }, [chainId, isSwapEnabled, isSwapRouteReady, swapRouteData, tokensToSwap.length]);

  const toReceiveAmount =
    alreadyInTargetTokenAmount + (swapRouteData?.quotes.reduce((acc, quote) => acc + quote.amountOut, 0n) ?? 0n);
  const toReceiveUsdFromQuotes = alreadyInTargetTokenUsd + (swapRouteData?.usdOut ?? 0n);
  const toReceiveUsd =
    swapTargetToken && toReceiveAmount > 0n
      ? convertToUsd(toReceiveAmount, swapTargetToken.decimals, swapTargetToken.prices.minPrice) ??
        toReceiveUsdFromQuotes
      : toReceiveUsdFromQuotes;

  const swapEstimatedNetworkFeeAmount = swapRouteData?.estimatedExecutionFee ?? 0n;

  const failedSwapTokenSymbols = useMemo(
    () =>
      failedSwapTokenAddresses
        .map((tokenAddress) => getByKey(tokensData, tokenAddress)?.symbol ?? getToken(chainId, tokenAddress).symbol)
        .join(", "),
    [chainId, failedSwapTokenAddresses, tokensData]
  );

  return {
    swapTargetTokenOptions,
    isSwapEnabled,
    setIsSwapEnabled,
    swapTargetTokenAddress,
    setSwapTargetTokenAddress,
    swapTargetToken,
    tokensToSwap,
    hasSwapRouteError,
    isSwapRouteLoading,
    isSwapRouteReady,
    settlementSwapExternalCalls,
    multichainSwapExternalCalls,
    toReceiveAmount,
    toReceiveUsd,
    swapEstimatedNetworkFeeAmount,
    failedSwapTokenSymbols,
  };
}

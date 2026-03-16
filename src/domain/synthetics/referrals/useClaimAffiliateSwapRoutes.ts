import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { getOpenOceanTxnData } from "domain/synthetics/externalSwaps/openOcean";
import { useGasPrice } from "domain/synthetics/fees/useGasPrice";
import { type SelectedClaimTokenAmount } from "domain/synthetics/referrals/claimAffiliateRewards";
import { convertToUsd } from "domain/synthetics/tokens";
import { metrics } from "lib/metrics";
import { getByKey } from "lib/objects";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress, getToken, getTokenBySymbol } from "sdk/configs/tokens";
import { type ExternalCallsPayload, combineExternalCalls, getExternalCallsPayload } from "sdk/utils/orderTransactions";
import type { Token, TokensData } from "sdk/utils/tokens/types";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/utils/trade/types";

export type SwapTargetTokenOption = {
  token: Token;
};

type ClaimSwapRouteResult = {
  quotes: ExternalSwapQuote[];
  failedTokenAddresses: string[];
  estimatedExecutionFee: bigint;
  usdOut: bigint;
};

const CLAIM_AFFILIATE_FIXED_SLIPPAGE_BPS = 300; // 3%

const SWAP_TARGET_TOKEN_OPTIONS_BY_CHAIN: Partial<Record<ContractsChainId, string[]>> = {
  [ARBITRUM]: [
    getTokenBySymbol(ARBITRUM, "GMX", { isSynthetic: false }).address,
    getTokenBySymbol(ARBITRUM, "USDC", { isSynthetic: false }).address,
    getTokenBySymbol(ARBITRUM, "WETH", { isSynthetic: false }).address,
    getTokenBySymbol(ARBITRUM, "BTC", { isSynthetic: false }).address,
  ],
  [AVALANCHE]: [
    getTokenBySymbol(AVALANCHE, "USDC", { isSynthetic: false }).address,
    getTokenBySymbol(AVALANCHE, "WAVAX", { isSynthetic: false }).address,
    getTokenBySymbol(AVALANCHE, "BTC", { isSynthetic: false }).address,
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
  isSwapEnabled,
}: {
  account: string | undefined;
  chainId: ContractsChainId;
  selectedClaimTokenAmountsByToken: Record<string, SelectedClaimTokenAmount>;
  tokensData: TokensData | undefined;
  isSwapEnabled: boolean;
}) {
  const gasPrice = useGasPrice(chainId);

  const swapTargetTokenOptions = useMemo(() => getSwapTargetTokenOptions(chainId), [chainId]);
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
  const alreadyInTargetTokenUsd =
    swapTargetToken && alreadyInTargetTokenAmount > 0n
      ? convertToUsd(alreadyInTargetTokenAmount, swapTargetToken.decimals, swapTargetToken.prices.minPrice) ?? 0n
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

  const swapRouteParams = useMemo(() => {
    if (!swapRouteEstimationKey || swapTargetTokenAddress === undefined || gasPrice === undefined) {
      return undefined;
    }

    return {
      chainId,
      estimationKey: swapRouteEstimationKey,
      swapTargetTokenAddress,
      tokensToSwap,
      gasPrice,
      allowedSlippage: CLAIM_AFFILIATE_FIXED_SLIPPAGE_BPS,
    };
  }, [chainId, gasPrice, swapRouteEstimationKey, swapTargetTokenAddress, tokensToSwap]);

  const swapRouteSwrKey =
    swapRouteParams !== undefined ? ["claim-affiliate-swap-routes", swapRouteParams.estimationKey] : null;

  const swapRouteAsyncResult = useSWR<ClaimSwapRouteResult>(swapRouteSwrKey, {
    refreshInterval: 10_000,
    keepPreviousData: true,
    fetcher: async () => {
      if (!swapRouteParams) {
        throw new Error("Invalid swap route parameters");
      }

      const externalHandlerAddress = getContract(swapRouteParams.chainId, "ExternalHandler");
      const client = getPublicClientWithRpc(swapRouteParams.chainId);

      const quoteResults = await Promise.all(
        swapRouteParams.tokensToSwap.map(async (tokenToSwap) => {
          const quoteData = await getOpenOceanTxnData({
            chainId: swapRouteParams.chainId,
            senderAddress: externalHandlerAddress,
            receiverAddress: externalHandlerAddress,
            tokenInAddress: tokenToSwap.tokenAddress,
            tokenOutAddress: swapRouteParams.swapTargetTokenAddress,
            amountIn: tokenToSwap.amount,
            gasPrice: swapRouteParams.gasPrice,
            slippage: swapRouteParams.allowedSlippage,
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
              address: convertTokenAddress(swapRouteParams.chainId, tokenToSwap.tokenAddress, "wrapped"),
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
            outTokenAddress: swapRouteParams.swapTargetTokenAddress,
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
              estimatedExecutionFee: quoteData.estimatedGas * quoteData.gasPrice,
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
  });

  const swapRouteData = swapRouteAsyncResult.data;
  const isSwapRouteMatchingSelection = useMemo(() => {
    if (!swapRouteData) {
      return false;
    }

    if (swapRouteData.quotes.length !== tokensToSwap.length) {
      return false;
    }

    const expectedAmountsByToken = Object.fromEntries(tokensToSwap.map((item) => [item.tokenAddress, item.amount]));

    return swapRouteData.quotes.every((quote) => expectedAmountsByToken[quote.inTokenAddress] === quote.amountIn);
  }, [swapRouteData, tokensToSwap]);
  const failedSwapTokenAddresses = useMemo(() => swapRouteData?.failedTokenAddresses ?? [], [swapRouteData]);
  const hasSwapRouteError = swapRouteAsyncResult.error !== undefined || failedSwapTokenAddresses.length > 0;
  const isSwapRouteLoading =
    swapRouteParams !== undefined && !hasSwapRouteError && (swapRouteAsyncResult.isLoading || !swapRouteData);
  const isSwapRouteReady =
    !isSwapEnabled ||
    tokensToSwap.length === 0 ||
    (!!swapRouteData &&
      !hasSwapRouteError &&
      isSwapRouteMatchingSelection &&
      swapRouteData.quotes.length === tokensToSwap.length);

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
    swapTargetTokenAddress,
    setSwapTargetTokenAddress,
    swapTargetToken,
    swapQuotes: swapRouteData?.quotes ?? [],
    hasSwapRouteError,
    isSwapRouteLoading,
    settlementSwapExternalCalls,
    multichainSwapExternalCalls,
    toReceiveAmount,
    toReceiveUsd,
    swapEstimatedNetworkFeeAmount,
    failedSwapTokenSymbols,
  };
}

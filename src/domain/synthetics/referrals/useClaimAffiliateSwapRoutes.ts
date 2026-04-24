import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import {
  getKyberSwapTxnData,
  KyberSwapSlippageError,
  type KyberSwapQuote,
} from "domain/synthetics/externalSwaps/kyberSwap";
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

type ClaimSwapRouteResult = {
  estimationKey: string;
  quotes: ExternalSwapQuote[];
  failedTokenAddresses: string[];
  slippageErrorTokenAddresses: string[];
  estimatedExecutionFee: bigint;
};

type SwapRouteParams = {
  chainId: ContractsChainId;
  estimationKey: string;
  swapTargetTokenAddress: string;
  tokensToSwap: SelectedClaimTokenAmount[];
  gasPrice: bigint;
  allowedSlippage: number;
};

export const CLAIM_AFFILIATE_FIXED_SLIPPAGE_BPS = 300; // 3%

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

function getSwapTargetTokenOptions(chainId: ContractsChainId): Token[] {
  const tokenAddresses = SWAP_TARGET_TOKEN_OPTIONS_BY_CHAIN[chainId] ?? [];

  return tokenAddresses.map((tokenAddress) => getToken(chainId, tokenAddress));
}

async function fetchSpenderApprovals({
  chainId,
  externalHandlerAddress,
  quotes,
}: {
  chainId: ContractsChainId;
  externalHandlerAddress: string;
  quotes: { tokenToSwap: SelectedClaimTokenAmount; quoteData: KyberSwapQuote }[];
}): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();

  if (quotes.length === 0) {
    return result;
  }

  const client = getPublicClientWithRpc(chainId);

  try {
    const multicallResults = await client.multicall({
      contracts: quotes.map(({ tokenToSwap, quoteData }) => ({
        address: convertTokenAddress(chainId, tokenToSwap.tokenAddress, "wrapped"),
        abi: abis.ERC20,
        functionName: "allowance",
        args: [externalHandlerAddress, quoteData.to],
      })),
    });

    for (let i = 0; i < quotes.length; i++) {
      const mcResult = multicallResults[i];
      const { tokenToSwap } = quotes[i];
      result.set(
        tokenToSwap.tokenAddress,
        mcResult.status === "success" ? (mcResult.result as bigint) < tokenToSwap.amount : true
      );
    }
  } catch (error) {
    metrics.pushError(error, "claimAffiliateRewards.swap.allowance");
    for (const { tokenToSwap } of quotes) {
      result.set(tokenToSwap.tokenAddress, true);
    }
  }

  return result;
}

async function fetchSwapRoutes(
  params: SwapRouteParams,
  signal: AbortSignal,
  onProgress: (current: number, total: number) => void
): Promise<ClaimSwapRouteResult> {
  const externalHandlerAddress = getContract(params.chainId, "ExternalHandler");

  // Fetch quotes sequentially to avoid KyberSwap 429 rate limits
  const quoteDataResults: {
    tokenToSwap: SelectedClaimTokenAmount;
    quoteData: KyberSwapQuote | undefined;
    isSlippageError?: boolean;
  }[] = [];

  const total = params.tokensToSwap.length + 1; // +1 for approvals check
  for (let idx = 0; idx < params.tokensToSwap.length; idx++) {
    const tokenToSwap = params.tokensToSwap[idx];
    signal.throwIfAborted();
    onProgress(idx + 1, total);

    let quoteData: KyberSwapQuote | undefined;
    try {
      quoteData = await getKyberSwapTxnData({
        chainId: params.chainId,
        senderAddress: externalHandlerAddress,
        receiverAddress: externalHandlerAddress,
        tokenInAddress: tokenToSwap.tokenAddress,
        tokenOutAddress: params.swapTargetTokenAddress,
        amountIn: tokenToSwap.amount,
        gasPrice: params.gasPrice,
        slippage: params.allowedSlippage,
        signal,
      });
    } catch (error) {
      if (error instanceof KyberSwapSlippageError) {
        quoteDataResults.push({ tokenToSwap, quoteData: undefined, isSlippageError: true });
        continue;
      }
      throw error;
    }

    quoteDataResults.push({ tokenToSwap, quoteData });
  }

  const successfulQuotes = quoteDataResults.filter(
    (r): r is typeof r & { quoteData: KyberSwapQuote } => r.quoteData !== undefined
  );

  onProgress(total, total);
  const needSpenderApprovalByToken = await fetchSpenderApprovals({
    chainId: params.chainId,
    externalHandlerAddress,
    quotes: successfulQuotes,
  });

  const quoteResults = quoteDataResults.map(({ tokenToSwap, quoteData, isSlippageError }) => {
    if (!quoteData) {
      return {
        tokenAddress: tokenToSwap.tokenAddress,
        quote: undefined,
        isSlippageError,
      };
    }

    return {
      tokenAddress: tokenToSwap.tokenAddress,
      quote: {
        aggregator: ExternalSwapAggregator.KyberSwap,
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
        needSpenderApproval: needSpenderApprovalByToken.get(tokenToSwap.tokenAddress) ?? true,
        txnData: {
          to: quoteData.to,
          data: quoteData.data,
          value: quoteData.value,
          estimatedGas: quoteData.estimatedGas,
          estimatedExecutionFee: quoteData.estimatedGas * quoteData.gasPrice,
        },
      } satisfies ExternalSwapQuote,
    };
  });

  const quotes = quoteResults.flatMap((result) => (result.quote ? [result.quote] : []));
  const failedTokenAddresses = quoteResults.flatMap((result) =>
    !result.quote && !result.isSlippageError ? [result.tokenAddress] : []
  );
  const slippageErrorTokenAddresses = quoteResults.flatMap((result) =>
    result.isSlippageError ? [result.tokenAddress] : []
  );

  return {
    estimationKey: params.estimationKey,
    quotes,
    failedTokenAddresses,
    slippageErrorTokenAddresses,
    estimatedExecutionFee: quotes.reduce((acc, quote) => acc + quote.txnData.estimatedExecutionFee, 0n),
  };
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
  allowedSlippage,
}: {
  account: string | undefined;
  chainId: ContractsChainId;
  selectedClaimTokenAmountsByToken: Record<string, SelectedClaimTokenAmount>;
  tokensData: TokensData | undefined;
  isSwapEnabled: boolean;
  allowedSlippage: number;
}) {
  const gasPrice = useGasPrice(chainId);

  const swapTargetTokenOptions = useMemo(() => getSwapTargetTokenOptions(chainId), [chainId]);
  const [swapTargetTokenAddress, setSwapTargetTokenAddress] = useState<string | undefined>(
    swapTargetTokenOptions[0]?.address
  );

  useEffect(() => {
    if (
      swapTargetTokenOptions.length > 0 &&
      (!swapTargetTokenAddress || !swapTargetTokenOptions.some((option) => option.address === swapTargetTokenAddress))
    ) {
      setSwapTargetTokenAddress(swapTargetTokenOptions[0].address);
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

  const alreadyInTargetTokenAmount = swapTargetTokenAddress
    ? selectedClaimTokenAmountsByToken[swapTargetTokenAddress]?.amount ?? 0n
    : 0n;

  const swapRouteEstimationKey = useMemo(() => {
    if (!isSwapEnabled || swapTargetTokenAddress === undefined || tokensToSwap.length === 0) {
      return undefined;
    }

    const sortedTokensToSwap = [...tokensToSwap]
      .map((item) => `${item.tokenAddress}:${item.amount.toString()}`)
      .sort()
      .join("|");

    return `${chainId}:${swapTargetTokenAddress}:${allowedSlippage}:${sortedTokensToSwap}`;
  }, [allowedSlippage, chainId, isSwapEnabled, swapTargetTokenAddress, tokensToSwap]);

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
      allowedSlippage,
    };
  }, [allowedSlippage, chainId, gasPrice, swapRouteEstimationKey, swapTargetTokenAddress, tokensToSwap]);

  const swapRouteSwrKey =
    swapRouteParams !== undefined ? ["claim-affiliate-swap-routes", swapRouteParams.estimationKey] : null;

  const [swapRouteFetchProgress, setSwapRouteFetchProgress] = useState<
    { current: number; total: number } | undefined
  >();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!swapRouteEstimationKey) {
      abortControllerRef.current?.abort();
    }
  }, [swapRouteEstimationKey]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const swapRouteAsyncResult = useSWR<ClaimSwapRouteResult>(swapRouteSwrKey, {
    refreshInterval: 10_000,

    fetcher: async () => {
      abortControllerRef.current?.abort();
      setSwapRouteFetchProgress(undefined);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (!swapRouteParams) {
        throw new Error("Invalid swap route parameters");
      }

      try {
        return await fetchSwapRoutes(swapRouteParams, abortController.signal, (current, total) => {
          setSwapRouteFetchProgress({ current, total });
        });
      } finally {
        setSwapRouteFetchProgress(undefined);
      }
    },
  });

  const swapRouteRawData = swapRouteAsyncResult.data;
  const isSwapRouteDataFresh = swapRouteRawData?.estimationKey === swapRouteEstimationKey;
  const swapRouteData = isSwapRouteDataFresh ? swapRouteRawData : undefined;
  const failedSwapTokenAddresses = useMemo(() => swapRouteData?.failedTokenAddresses ?? [], [swapRouteData]);
  const slippageErrorTokenAddresses = useMemo(() => swapRouteData?.slippageErrorTokenAddresses ?? [], [swapRouteData]);
  const hasApiSlippageError = slippageErrorTokenAddresses.length > 0;
  const hasSwapRouteError =
    isSwapRouteDataFresh &&
    (swapRouteAsyncResult.error !== undefined || failedSwapTokenAddresses.length > 0 || hasApiSlippageError);
  const isSwapRouteLoading =
    swapRouteParams === undefined ? isSwapEnabled && tokensToSwap.length > 0 : !hasSwapRouteError && !swapRouteData;
  const isSwapRouteReady =
    !isSwapEnabled ||
    tokensToSwap.length === 0 ||
    (!!swapRouteData && !hasSwapRouteError && swapRouteData.quotes.length === tokensToSwap.length);

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
  const toReceiveUsd =
    swapTargetToken && toReceiveAmount > 0n
      ? convertToUsd(toReceiveAmount, swapTargetToken.decimals, swapTargetToken.prices.minPrice) ?? 0n
      : 0n;

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
    hasApiSlippageError,
    isSwapRouteLoading,
    nothingToSwap: tokensToSwap.length === 0,
    settlementSwapExternalCalls,
    multichainSwapExternalCalls,
    toReceiveAmount,
    toReceiveUsd,
    swapEstimatedNetworkFeeAmount,
    failedSwapTokenSymbols,
    swapRouteFetchProgress,
  };
}

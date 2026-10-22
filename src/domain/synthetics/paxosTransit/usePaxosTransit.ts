import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useStableRequestAmountIn } from "domain/synthetics/externalSwaps/useExternalSwapOutputRequest";
import { convertToTokenAmount, convertToUsd, getMidPrice, type TokenData } from "domain/synthetics/tokens";
import { useDebounce } from "lib/debounce/useDebounce";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitOrder, TransitQuoteParams } from "sdk/utils/paxos/types";

import { mockTransitApi } from "./mockTransitApi";
import { submitTransitOrder } from "./submitTransitOrder";
import { findPendingTransitOrder, TRANSIT_RECENT_ORDERS_PAGE_SIZE } from "./transitOrders";
import type { PaxosTransitConversion } from "./transitRouteProgress";
import type { TransitApi } from "./types";
import { useTransitMinOrderSizes } from "./useTransitMinOrderSizes";
import { getIsTransitQuoteNeeded, getIsZeroFeeRejection, getShouldUseTransit, getTransitFeeTier } from "./utils";

type PaxosTransitSubmitStep = "idle" | "approving" | "submitting";

const FEE_TIER_REFRESH_INTERVAL = 60_000;
const QUOTE_REFRESH_INTERVAL = 30_000;

export function usePaxosTransit({
  chainId,
  tokenIn,
  tokenOut,
  amount,
  collateralSwapTotalFeesDeltaUsd,
  isTransitRequired = false,
  isAmountEstimated = false,
  isWhitelistIgnored = false,
  thresholdUsdOverride,
  isMocked,
  enabled,
  onPendingOrderFound,
}: {
  chainId: ContractsChainId;
  tokenIn: TokenData | undefined;
  tokenOut: TokenData | undefined;
  amount: bigint;
  collateralSwapTotalFeesDeltaUsd: bigint | undefined;
  isTransitRequired?: boolean;
  isAmountEstimated?: boolean;
  isWhitelistIgnored?: boolean;
  thresholdUsdOverride?: bigint;
  isMocked: boolean;
  enabled: boolean;
  onPendingOrderFound: (order: TransitOrder) => void;
}) {
  const sdk = useGmxSdk(chainId);
  const api: TransitApi | undefined = isMocked ? mockTransitApi : sdk;
  const { account, signer } = useWallet();
  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const thresholdUsd = thresholdUsdOverride ?? paxosTransitConfig?.thresholdUsd;
  const isActive = Boolean(enabled && paxosTransitConfig && api && account && tokenIn && tokenOut);
  const tokenInAddress = tokenIn?.address;
  const tokenOutAddress = tokenOut?.address;

  const [step, setStep] = useState<PaxosTransitSubmitStep>("idle");
  const [isStandardFeeForced, setIsStandardFeeForced] = useState(false);

  const requestAmount =
    useStableRequestAmountIn(amount, `${tokenInAddress}:${tokenOutAddress}`, isAmountEstimated) ?? 0n;
  const debouncedAmount: bigint = useDebounce(requestAmount, 500);

  const {
    data: feeTierData,
    error: feeTierError,
    mutate: refreshFeeTier,
  } = useSWR(
    isActive ? ["paxosTransitFeeTier", chainId, account] : null,
    () => api!.fetchTransitFeeTier({ userAddress: account! }),
    { refreshInterval: FEE_TIER_REFRESH_INTERVAL, onErrorRetry: retryAtRefreshCadence }
  );

  const minOrderSizes = useTransitMinOrderSizes({
    api,
    chainId,
    offerAsset: tokenInAddress,
    wantAsset: tokenOutAddress,
    isActive,
    isZeroFeeEligible: feeTierData?.feeTier === "zeroFee",
  });

  const { isWhitelisted, isZeroFeePaused, isZeroFeeCapacityShort, feeTier } = getTransitFeeTier({
    feeTierData,
    isWhitelistIgnored,
    isUsdcToUsdg: tokenInAddress === paxosTransitConfig?.usdcAddress,
    amount,
    zeroFeeMinOrderSize: minOrderSizes.zeroFee,
    isStandardFeeForced,
  });

  const amountUsd = tokenIn ? convertToUsd(debouncedAmount, tokenIn.decimals, getMidPrice(tokenIn.prices)) : 0n;
  const minOrderSize = feeTier === "zeroFee" ? minOrderSizes.zeroFee : minOrderSizes.standardFee;
  const isBelowMinOrderSize = minOrderSize !== undefined && debouncedAmount > 0n && debouncedAmount < minOrderSize;
  const isQuoteNeeded =
    isActive &&
    debouncedAmount > 0n &&
    !isBelowMinOrderSize &&
    feeTierData !== undefined &&
    getIsTransitQuoteNeeded({
      isTransitRequired,
      isWhitelisted,
      collateralSwapTotalFeesDeltaUsd,
      amountUsd,
      thresholdUsd: thresholdUsd!,
    });

  const getQuoteParams = useCallback(
    (offerAmount: bigint): TransitQuoteParams => ({
      userAddress: account!,
      offerAsset: tokenInAddress!,
      wantAsset: tokenOutAddress!,
      offerAmount,
      sourceChainId: chainId,
      destinationChainId: chainId,
      feeTier,
    }),
    [account, chainId, feeTier, tokenInAddress, tokenOutAddress]
  );

  const { data: quoteResult, error: quoteError } = useSWR(
    isQuoteNeeded && step === "idle"
      ? ["paxosTransitQuote", chainId, account, tokenInAddress, debouncedAmount.toString(), feeTier]
      : null,
    async () => ({ feeTier, quote: await api!.fetchTransitQuote(getQuoteParams(debouncedAmount)) }),
    {
      refreshInterval: QUOTE_REFRESH_INTERVAL,
      onErrorRetry: retryAtRefreshCadence,
      keepPreviousData: !isBelowMinOrderSize,
    }
  );
  const quote = quoteResult?.feeTier === feeTier ? quoteResult.quote : undefined;

  useEffect(
    function allowZeroFeeAgainAfterFeeTierChange() {
      setIsStandardFeeForced(false);
    },
    [feeTierData]
  );

  const isZeroFeeQuoteRejected = feeTier === "zeroFee" && getIsZeroFeeRejection(quoteError);

  useEffect(
    function refreshFeeTierAfterZeroFeeRejection() {
      if (isZeroFeeQuoteRejected) {
        refreshFeeTier();
      }
    },
    [isZeroFeeQuoteRejected, refreshFeeTier]
  );

  const transitFeesUsd =
    quote && tokenIn ? convertToUsd(quote.totalFees, tokenIn.decimals, getMidPrice(tokenIn.prices)) : undefined;

  const estimatedUsdIn = convertToUsd(amount, tokenIn?.decimals, tokenIn?.prices.minPrice);
  const estimatedAmountOut = convertToTokenAmount(estimatedUsdIn, tokenOut?.decimals, tokenOut?.prices.maxPrice);
  const amountOut = quote?.amountOut ?? estimatedAmountOut;

  const shouldUseTransit =
    isActive &&
    ((isTransitRequired && quote !== undefined) ||
      getShouldUseTransit({
        amountUsd: amountUsd ?? 0n,
        isWhitelisted,
        transitFeesUsd,
        collateralSwapTotalFeesDeltaUsd,
        thresholdUsd: thresholdUsd!,
      }));

  useSWR(
    isActive ? ["paxosTransitPendingOrder", chainId, account, tokenInAddress] : null,
    async function resumePendingOrder() {
      const { orders } = await api!.fetchTransitOrders({
        userAddress: account!,
        pageSize: TRANSIT_RECENT_ORDERS_PAGE_SIZE,
      });
      const pendingOrder = findPendingTransitOrder(orders, {
        offerAsset: tokenInAddress!,
        wantAsset: tokenOutAddress!,
      });

      if (pendingOrder) {
        onPendingOrderFound(pendingOrder);
      }

      return pendingOrder ?? null;
    },
    {
      refreshInterval: 0,
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const submitTransit = useCallback(async (): Promise<PaxosTransitConversion | undefined> => {
    if (!isActive || !signer || amount <= 0n) return undefined;

    try {
      const conversion = await submitTransitOrder({
        api: api!,
        chainId,
        signer,
        account: account!,
        params: getQuoteParams(amount),
        isMocked,
        onStep: setStep,
      });

      setStep("idle");

      return conversion;
    } catch (error) {
      setStep("idle");

      if (feeTier === "zeroFee" && getIsZeroFeeRejection(error)) {
        setIsStandardFeeForced(true);
        refreshFeeTier();
      }

      throw error;
    }
  }, [account, amount, api, chainId, feeTier, getQuoteParams, isActive, isMocked, refreshFeeTier, signer]);

  return {
    shouldUseTransit,
    thresholdUsd,
    isQuoteNeeded,
    isFeeTierLoaded: feeTierData !== undefined,
    isWhitelisted,
    feeTier,
    zeroFeeCapacity: feeTierData?.zeroFeeCapacity,
    zeroFeeExpectedReopenAt: feeTierData?.zeroFeeExpectedReopenAt,
    feeTierError,
    isZeroFeePaused,
    isZeroFeeCapacityShort,
    isBelowMinOrderSize,
    minOrderSize,
    quote,
    quoteError,
    transitFeesUsd,
    amountOut,
    step,
    submitTransit,
  };
}

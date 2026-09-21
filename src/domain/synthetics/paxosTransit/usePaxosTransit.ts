import { useCallback, useState } from "react";
import useSWR from "swr";

import { getPaxosTransitConfig, getShouldShowPaxosTransit } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { convertToTokenAmount, convertToUsd, getMidPrice, type TokenData } from "domain/synthetics/tokens";
import { useDebounce } from "lib/debounce/useDebounce";
import { roundToOrder } from "lib/numbers";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";
import { HttpError } from "sdk/utils/http/http";
import type { TransitOrder, TransitQuoteParams } from "sdk/utils/paxos/types";

import { IS_PAXOS_TRANSIT_MOCKED, mockTransitApi, type TransitApi } from "./mockTransitApi";
import { findPendingTransitOrder, getSubmittedTransitOrderId } from "./transitOrders";
import { getIsTransitQuoteNeeded, getTransitFeeTier } from "./utils";

export type PaxosTransitStep = "idle" | "approving" | "submitting" | "locating" | "converting";

type TransitProgress = { step: PaxosTransitStep; orderId: string | undefined; order: TransitOrder | undefined };

const IDLE_PROGRESS: TransitProgress = { step: "idle", orderId: undefined, order: undefined };

const FEE_TIER_REFRESH_INTERVAL = 60_000;
const QUOTE_REFRESH_INTERVAL = 30_000;
const ORDER_REFRESH_INTERVAL = 5_000;
const RECENT_ORDERS_PAGE_SIZE = 10;
const PREVIEW_AMOUNT_SIGNIFICANT_DIGITS = 3;

export function usePaxosTransit({
  chainId,
  tokenIn,
  tokenOut,
  amount,
  swapFeesUsd,
  isTransitRequired = false,
  isWhitelistIgnored = false,
  enabled,
  onFulfilled,
}: {
  chainId: ContractsChainId;
  tokenIn: TokenData | undefined;
  tokenOut: TokenData | undefined;
  amount: bigint;
  swapFeesUsd: bigint | undefined;
  isTransitRequired?: boolean;
  isWhitelistIgnored?: boolean;
  enabled: boolean;
  onFulfilled: (order: TransitOrder) => void;
}) {
  const sdk = useGmxSdk(chainId);
  const api: TransitApi | undefined = IS_PAXOS_TRANSIT_MOCKED ? mockTransitApi : sdk;
  const { account, signer } = useWallet();
  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const isActive = Boolean(enabled && paxosTransitConfig && api && account && tokenIn && tokenOut);
  const tokenInAddress = tokenIn?.address;
  const tokenOutAddress = tokenOut?.address;

  const [progress, setProgress] = useState<TransitProgress>(IDLE_PROGRESS);
  const { step, orderId, order } = progress;
  const setStep = useCallback(
    (nextStep: PaxosTransitStep) => setProgress({ step: nextStep, orderId: undefined, order: undefined }),
    []
  );
  const [isStandardFeeForced, setIsStandardFeeForced] = useState(false);

  const previewAmount = roundToOrder(amount, PREVIEW_AMOUNT_SIGNIFICANT_DIGITS);
  const debouncedAmount: bigint = useDebounce(previewAmount, 500);

  const { data: feeTierData, error: feeTierError } = useSWR(
    isActive ? ["paxosTransitFeeTier", chainId, account] : null,
    () => api!.fetchTransitFeeTier({ userAddress: account! }),
    { refreshInterval: FEE_TIER_REFRESH_INTERVAL }
  );

  const { isWhitelisted, isZeroFeeCapacityShort, feeTier } = getTransitFeeTier({
    feeTierData,
    isWhitelistIgnored,
    isUsdcOffered: tokenInAddress === paxosTransitConfig?.usdcAddress,
    amount,
    isStandardFeeForced,
  });

  const amountUsd = tokenIn ? convertToUsd(debouncedAmount, tokenIn.decimals, getMidPrice(tokenIn.prices)) : 0n;
  const isQuoteNeeded =
    isActive &&
    debouncedAmount > 0n &&
    feeTierData !== undefined &&
    getIsTransitQuoteNeeded({
      isTransitRequired,
      isWhitelisted,
      swapFeesUsd,
      amountUsd,
      minAmountUsd: paxosTransitConfig!.minAmountUsd,
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

  const { data: quote, error: quoteError } = useSWR(
    isQuoteNeeded && step === "idle"
      ? ["paxosTransitQuote", chainId, account, tokenInAddress, debouncedAmount.toString(), feeTier]
      : null,
    () => api!.fetchTransitQuote(getQuoteParams(debouncedAmount)),
    { refreshInterval: QUOTE_REFRESH_INTERVAL, shouldRetryOnError: false, keepPreviousData: true }
  );

  const transitFeesUsd =
    quote && tokenIn ? convertToUsd(quote.totalFees, tokenIn.decimals, getMidPrice(tokenIn.prices)) : undefined;

  const estimatedUsdIn = convertToUsd(amount, tokenIn?.decimals, tokenIn?.prices.minPrice);
  const estimatedAmountOut = convertToTokenAmount(estimatedUsdIn, tokenOut?.decimals, tokenOut?.prices.maxPrice);
  const amountOut = quote?.amountOut ?? estimatedAmountOut;

  const shouldUseTransit =
    isActive &&
    ((isTransitRequired && quote !== undefined) ||
      getShouldShowPaxosTransit({
        chainId,
        amountUsd: amountUsd ?? 0n,
        isWhitelisted,
        transitFeesUsd,
        swapFeesUsd,
      }));

  useSWR(
    isActive ? ["paxosTransitPendingOrder", chainId, account, tokenInAddress] : null,
    async function resumePendingOrder() {
      const { orders } = await api!.fetchTransitOrders({ userAddress: account!, pageSize: RECENT_ORDERS_PAGE_SIZE });
      const pendingOrder = findPendingTransitOrder(orders, {
        offerAsset: tokenInAddress!,
        wantAsset: tokenOutAddress!,
      });

      if (pendingOrder) {
        setProgress((current) =>
          current.step === "idle" ? { step: "converting", orderId: pendingOrder.id, order: pendingOrder } : current
        );
      }

      return pendingOrder ?? null;
    },
    { refreshInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }
  );

  useSWR(
    orderId && api ? ["paxosTransitOrder", chainId, orderId] : null,
    async function pollTransitOrder() {
      const polledOrder = await api!.fetchTransitOrder({ orderId: orderId! });

      if (polledOrder.status === "PROCESSED" || polledOrder.status === "REMOVED") {
        setProgress(IDLE_PROGRESS);
      } else {
        setProgress((current) =>
          current.orderId === polledOrder.id ? { ...current, step: "converting", order: polledOrder } : current
        );
      }

      if (polledOrder.status === "PROCESSED") {
        onFulfilled(polledOrder);
      }

      return polledOrder;
    },
    { refreshInterval: ORDER_REFRESH_INTERVAL }
  );

  const submitTransit = useCallback(async () => {
    if (!isActive || !signer || amount <= 0n) return;

    const params = getQuoteParams(amount);

    try {
      setStep("approving");
      const approvalQuote = await api!.fetchTransitQuote(params);
      const authorization = await api!.fetchTransitAuthorization({
        userAddress: account!,
        tokenAddress: params.offerAsset,
        spenderAddress: approvalQuote.transaction.to,
        amount,
        chainId,
      });

      if (!authorization.alreadyApproved) {
        const approveMethod = authorization.methods.find((method) => method.type === "erc20_approve");

        if (approveMethod?.type !== "erc20_approve") {
          throw new Error("Paxos Transit returned no approval transaction");
        }

        const approveTxn = await sendWalletTransaction({
          chainId,
          signer,
          to: params.offerAsset,
          callData: approveMethod.transaction.encoded,
        });
        await approveTxn.wait();
      }

      setStep("submitting");
      // the fee tier and deadline are fixed at quote time, so quote again right before sending
      const submitQuote = await api!.fetchTransitQuote(params);

      if (!submitQuote.transaction.data) {
        throw new Error("Paxos Transit quote has no calldata");
      }

      let submittedOrderId: string | undefined;

      if (IS_PAXOS_TRANSIT_MOCKED) {
        submittedOrderId = mockTransitApi.submitOrder(params);
      } else {
        const submitTxn = await sendWalletTransaction({
          chainId,
          signer,
          to: submitQuote.transaction.to,
          callData: submitQuote.transaction.data,
          value: submitQuote.transaction.value,
        });

        const receipt = await submitTxn.wait();

        if (receipt.status !== "success" || !receipt.transactionHash) {
          throw new Error("Paxos Transit order transaction failed");
        }

        submittedOrderId = await getSubmittedTransitOrderId({
          chainId,
          txnHash: receipt.transactionHash,
          stationAddress: submitQuote.transaction.to,
        });
      }

      if (!submittedOrderId) {
        throw new Error("Paxos Transit order transaction has no OrderSubmitted event");
      }

      setProgress({ step: "locating", orderId: submittedOrderId, order: undefined });
    } catch (error) {
      setStep("idle");

      if (error instanceof HttpError && (error.statusCode === 403 || error.statusCode === 409)) {
        setIsStandardFeeForced(true);
      }

      throw error;
    }
  }, [account, amount, api, chainId, getQuoteParams, isActive, setStep, signer]);

  return {
    shouldUseTransit,
    isQuoteNeeded,
    isAmountSettling: previewAmount !== debouncedAmount,
    isFeeTierLoaded: feeTierData !== undefined,
    zeroFeeCapacity: feeTierData?.zeroFeeCapacity,
    feeTierError,
    isZeroFeeCapacityShort,
    feeTier,
    quote,
    quoteError,
    transitFeesUsd,
    amountOut,
    step,
    order,
    submitTransit,
  };
}

import { useCallback, useState } from "react";
import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useStableRequestAmountIn } from "domain/synthetics/externalSwaps/useExternalSwapOutputRequest";
import { convertToTokenAmount, convertToUsd, getMidPrice, type TokenData } from "domain/synthetics/tokens";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";
import { HttpError } from "sdk/utils/http/http";
import type { TransitOrder, TransitQuoteParams } from "sdk/utils/paxos/types";

import { MOCK_CONVERSION_MS, mockTransitApi } from "./mockTransitApi";
import { findPendingTransitOrder, getSubmittedTransitOrderId } from "./transitOrders";
import { getIsTransitQuoteNeeded, getShouldUseTransit, getTransitFeeTier, getTransitMinOrderSize } from "./utils";

type PaxosTransitSubmitStep = "idle" | "approving" | "submitting";

const FEE_TIER_REFRESH_INTERVAL = 60_000;
const ROUTES_REFRESH_INTERVAL = 60_000;
const QUOTE_REFRESH_INTERVAL = 30_000;
const RECENT_ORDERS_PAGE_SIZE = 10;

export function usePaxosTransit({
  chainId,
  tokenIn,
  tokenOut,
  amount,
  collateralSwapTotalFeesDeltaUsd,
  isTransitRequired = false,
  isAmountEstimated = false,
  isWhitelistIgnored = false,
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
  isMocked: boolean;
  enabled: boolean;
  onPendingOrderFound: (order: TransitOrder) => void;
}) {
  const sdk = useGmxSdk(chainId);
  const api: TransitApi | undefined = isMocked ? mockTransitApi : sdk;
  const { account, signer } = useWallet();
  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const isActive = Boolean(enabled && paxosTransitConfig && api && account && tokenIn && tokenOut);
  const tokenInAddress = tokenIn?.address;
  const tokenOutAddress = tokenOut?.address;

  const [step, setStep] = useState<PaxosTransitSubmitStep>("idle");
  const [isStandardFeeForced, setIsStandardFeeForced] = useState(false);

  const requestAmount =
    useStableRequestAmountIn(amount, `${tokenInAddress}:${tokenOutAddress}`, isAmountEstimated) ?? 0n;
  const debouncedAmount: bigint = useDebounce(requestAmount, 500);

  const { data: feeTierData, error: feeTierError } = useSWR(
    isActive ? ["paxosTransitFeeTier", chainId, account] : null,
    () => api!.fetchTransitFeeTier({ userAddress: account! }),
    { refreshInterval: FEE_TIER_REFRESH_INTERVAL }
  );

  const { data: zeroFeeRoutes } = useSWR(
    isActive && feeTierData?.feeTier === "zeroFee" ? ["paxosTransitRoutes", chainId, "zeroFee"] : null,
    () => api!.fetchTransitRoutes({ feeTier: "zeroFee" }),
    { refreshInterval: ROUTES_REFRESH_INTERVAL }
  );

  const routeParams = { chainId, offerAsset: tokenInAddress, wantAsset: tokenOutAddress };
  const zeroFeeMinOrderSize = getTransitMinOrderSize(zeroFeeRoutes, routeParams);

  const { isWhitelisted, isZeroFeeCapacityShort, feeTier } = getTransitFeeTier({
    feeTierData,
    isWhitelistIgnored,
    isUsdcOffered: tokenInAddress === paxosTransitConfig?.usdcAddress,
    amount,
    zeroFeeMinOrderSize,
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
      collateralSwapTotalFeesDeltaUsd,
      amountUsd,
      thresholdUsd: paxosTransitConfig!.thresholdUsd,
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
      getShouldUseTransit({
        amountUsd: amountUsd ?? 0n,
        isWhitelisted,
        transitFeesUsd,
        collateralSwapTotalFeesDeltaUsd,
        thresholdUsd: paxosTransitConfig!.thresholdUsd,
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
      let submitTxnHash: string | undefined;

      if (isMocked) {
        submittedOrderId = mockTransitApi.submitOrder(params);
        helperToast.info(`Mock conversion, no real transaction. Ready in ~${MOCK_CONVERSION_MS / 1000}s.`);
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

        submitTxnHash = receipt.transactionHash;

        submittedOrderId = await getSubmittedTransitOrderId({
          chainId,
          txnHash: receipt.transactionHash,
          stationAddress: submitQuote.transaction.to,
        });
      }

      if (!submittedOrderId) {
        throw new Error("Paxos Transit order transaction has no OrderSubmitted event");
      }

      setStep("idle");

      return { orderId: submittedOrderId, txnHash: submitTxnHash, offerAmount: amount, isMocked };
    } catch (error) {
      setStep("idle");

      if (error instanceof HttpError && (error.statusCode === 403 || error.statusCode === 409)) {
        setIsStandardFeeForced(true);
      }

      throw error;
    }
  }, [account, amount, api, chainId, getQuoteParams, isActive, isMocked, signer]);

  return {
    shouldUseTransit,
    isQuoteNeeded,
    isFeeTierLoaded: feeTierData !== undefined,
    isWhitelisted,
    zeroFeeCapacity: feeTierData?.zeroFeeCapacity,
    feeTierError,
    isZeroFeeCapacityShort,
    isBelowZeroFeeMinimum,
    feeTier,
    quote,
    quoteError,
    transitFeesUsd,
    amountOut,
    step,
    submitTransit,
  };
}

import { useRef } from "react";
import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { formatUsd } from "lib/numbers";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";

import { mockTransitApi } from "./mockTransitApi";
import { formatPaxosMinOrderSize, getIsStandardPaxosRouteShown, getPaxosRouteStates } from "./tradeboxRoutes";
import type { PaxosRouteState, PaxosSwapRoute } from "./tradeboxRoutes";
import type { TransitApi } from "./types";
import { usePaxosTransitDebugSettings } from "./usePaxosTransitDebugSettings";
import { useTransitMinOrderSizes } from "./useTransitMinOrderSizes";

const FEE_TIER_REFRESH_INTERVAL = 60_000;
const QUOTE_REFRESH_INTERVAL = 30_000;
const AMOUNT_DEBOUNCE_MS = 500;

type SwapTabPaxosOffer = { isOffered: boolean; minimumText: string | undefined; isWalletOnly: boolean };

const UNRESOLVED_OFFER: SwapTabPaxosOffer = { isOffered: false, minimumText: undefined, isWalletOnly: false };

export function getTradeboxPaxosFeeTierKey(chainId: number, account: string, isMocked: boolean) {
  return ["tradeboxPaxosFeeTier", chainId, account, isMocked];
}

export function getTradeboxPaxosQuoteKey(p: {
  route: PaxosSwapRoute;
  chainId: number;
  account: string | undefined;
  tokenInAddress: string | undefined;
  tokenOutAddress: string | undefined;
  amount: bigint;
  isMocked: boolean;
}) {
  return [
    "tradeboxPaxosQuote",
    p.route,
    p.chainId,
    p.account,
    p.tokenInAddress,
    p.tokenOutAddress,
    p.amount.toString(),
    p.isMocked,
  ];
}

/**
 * Whether the Swap tab offers a Paxos route for converting this much USDC to USDG, so a hand-off never lands on a
 * tab without one, and from what amount Paxos would take it when it doesn't
 */
export function useIsSwapTabPaxosOffered({
  amount,
  amountUsd,
  instantAmountOut,
  isGmxAccount,
  enabled,
}: {
  amount: bigint | undefined;
  amountUsd: bigint | undefined;
  /** what the Swap tab's instant route pays out for the amount, undefined when it can't fill it */
  instantAmountOut: bigint | undefined;
  isGmxAccount: boolean;
  enabled: boolean;
}) {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const sdk = useGmxSdk(chainId);
  const { isWhitelistIgnored, isStandardForced, isMocked, thresholdUsdOverride } = usePaxosTransitDebugSettings();
  const api: TransitApi | undefined = isMocked ? mockTransitApi : sdk;
  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const isActive = enabled && paxosTransitConfig !== undefined && api !== undefined;
  // the Swap tab runs Paxos only from the wallet on the settlement chain
  const isPaidOutsideWallet = srcChainId !== undefined || isGmxAccount;

  const { data: feeTierData, error: feeTierError } = useSWR(
    isActive && account !== undefined ? getTradeboxPaxosFeeTierKey(chainId, account, isMocked) : null,
    () => api!.fetchTransitFeeTier({ userAddress: account! }),
    { refreshInterval: FEE_TIER_REFRESH_INTERVAL, onErrorRetry: retryAtRefreshCadence }
  );
  const isWhitelisted = feeTierData?.feeTier === "zeroFee" && !isWhitelistIgnored;

  const minOrderSizes = useTransitMinOrderSizes({
    api,
    chainId,
    offerAsset: paxosTransitConfig?.usdcAddress,
    wantAsset: paxosTransitConfig?.usdgAddress,
    isActive,
    isZeroFeeEligible: isWhitelisted,
  });

  const thresholdUsd = thresholdUsdOverride ?? paxosTransitConfig?.thresholdUsd;

  // until the fee tier and minimum order sizes answer, or when the fee tier fails, the Swap tab's choice is unknown,
  // so Paxos copy is held back; a minimum order size that failed to load counts as none, as on the Swap tab
  const isResolved =
    isActive &&
    !feeTierError &&
    feeTierData !== undefined &&
    !minOrderSizes.isLoading &&
    amount !== undefined &&
    amountUsd !== undefined &&
    thresholdUsd !== undefined;
  const routeStates = isResolved
    ? getPaxosRouteStates({
        isWhitelisted,
        isStandardForced,
        isUsdcToUsdg: true,
        amountIn: amount,
        amountInUsd: amountUsd,
        thresholdUsd,
        isZeroFeeAvailable: feeTierData.isZeroFeeAvailable,
        zeroFeeExpectedReopenAt: feeTierData.zeroFeeExpectedReopenAt,
        zeroFeeCapacity: isWhitelisted ? feeTierData.zeroFeeCapacity : undefined,
        zeroFeeMinOrderSize: minOrderSizes.zeroFee,
        standardMinOrderSize: minOrderSizes.standardFee,
      })
    : undefined;

  // the Swap tab offers the standard route to non-whitelisted traders only when it pays out more than instant
  const isStandardQuoteCompared = routeStates?.paxosStandard.status === "quote" && !isWhitelisted && !isStandardForced;
  // quotes follow the amount once typing stops, as on the Swap tab, so both share the cached quote
  const lastSettledOfferRef = useRef<SwapTabPaxosOffer>(UNRESOLVED_OFFER);
  const quoteAmount: bigint | undefined = useDebounce(amount, AMOUNT_DEBOUNCE_MS);
  const { data: standardQuote, isLoading: isStandardQuoteLoading } = useSWR(
    isStandardQuoteCompared && quoteAmount !== undefined
      ? getTradeboxPaxosQuoteKey({
          route: "paxosStandard",
          chainId,
          account,
          tokenInAddress: paxosTransitConfig?.usdcAddress,
          tokenOutAddress: paxosTransitConfig?.usdgAddress,
          amount: quoteAmount,
          isMocked,
        })
      : null,
    () =>
      api!.fetchTransitQuote({
        userAddress: account!,
        offerAsset: paxosTransitConfig!.usdcAddress,
        wantAsset: paxosTransitConfig!.usdgAddress,
        offerAmount: quoteAmount!,
        sourceChainId: chainId,
        destinationChainId: chainId,
        feeTier: "standardFee",
      }),
    { refreshInterval: QUOTE_REFRESH_INTERVAL, onErrorRetry: retryAtRefreshCadence }
  );

  if (!routeStates || amount === undefined || amountUsd === undefined || thresholdUsd === undefined) {
    lastSettledOfferRef.current = UNRESOLVED_OFFER;
    return UNRESOLVED_OFFER;
  }

  // a quote for another amount, or one still loading, can't tell whether the Swap tab offers this amount yet,
  // so the last settled answer holds and the link doesn't blink while the trader types
  if (isStandardQuoteCompared && (quoteAmount !== amount || isStandardQuoteLoading)) {
    return lastSettledOfferRef.current;
  }

  const offer = getSwapTabPaxosOffer({
    routeStates,
    // like the Swap tab, a refresh that fails keeps the last quote, and a first fetch that fails leaves none
    standardQuoteAmountOut: isStandardQuoteCompared ? standardQuote?.amountOut : undefined,
    isStandardQuoteCompared,
    instantAmountOut,
    isPaidOutsideWallet,
    isWhitelisted,
    isStandardForced,
    amount,
    amountUsd,
    thresholdUsd,
    zeroFeeMinOrderSize: minOrderSizes.zeroFee,
    standardMinOrderSize: minOrderSizes.standardFee,
    usdcToken: getToken(chainId, paxosTransitConfig!.usdcAddress),
  });
  lastSettledOfferRef.current = offer;

  return offer;
}

export function getSwapTabPaxosOffer(p: {
  routeStates: Record<PaxosSwapRoute, PaxosRouteState>;
  standardQuoteAmountOut: bigint | undefined;
  isStandardQuoteCompared: boolean;
  instantAmountOut: bigint | undefined;
  isPaidOutsideWallet: boolean;
  isWhitelisted: boolean;
  isStandardForced: boolean;
  amount: bigint;
  amountUsd: bigint;
  thresholdUsd: bigint;
  zeroFeeMinOrderSize: bigint | undefined;
  standardMinOrderSize: bigint | undefined;
  usdcToken: Token;
}): SwapTabPaxosOffer {
  const { routeStates } = p;
  const isStandardOffered =
    routeStates.paxosStandard.status === "quote" &&
    (!p.isStandardQuoteCompared ||
      (p.standardQuoteAmountOut !== undefined &&
        (p.instantAmountOut === undefined || p.standardQuoteAmountOut > p.instantAmountOut)));
  // a zero-fee route short on capacity is still offered, with the capacity choice on the Swap tab
  const isRouteOffered =
    routeStates.paxosZeroFee.status === "quote" ||
    routeStates.paxosZeroFee.status === "capacityShort" ||
    isStandardOffered;

  if (isRouteOffered) {
    return { isOffered: !p.isPaidOutsideWallet, minimumText: undefined, isWalletOnly: p.isPaidOutsideWallet };
  }

  const formatMinOrderSize = (minOrderSize: bigint) =>
    `${formatPaxosMinOrderSize(minOrderSize, p.usdcToken.decimals)} ${p.usdcToken.symbol}`;
  const isStandardShown = getIsStandardPaxosRouteShown({
    isWhitelisted: p.isWhitelisted,
    isStandardForced: p.isStandardForced,
    amountInUsd: p.amountUsd,
    thresholdUsd: p.thresholdUsd,
  });
  const minOrderSizesAbove = [routeStates.paxosZeroFee, routeStates.paxosStandard].flatMap((state) =>
    state.status === "belowMinOrderSize" ? [state.minOrderSize] : []
  );
  const smallestMinOrderSize = minOrderSizesAbove.reduce<bigint | undefined>(
    (smallest, size) => (smallest === undefined || size < smallest ? size : smallest),
    undefined
  );
  let minimumText: string | undefined;

  if (!isStandardShown) {
    minimumText = formatUsd(p.thresholdUsd, { displayDecimals: 0 });
  } else if (smallestMinOrderSize !== undefined) {
    minimumText = formatMinOrderSize(smallestMinOrderSize);
  } else if (p.standardMinOrderSize !== undefined && p.amount < p.standardMinOrderSize) {
    // a non-whitelisted standard route under its minimum is hidden rather than shown below it
    minimumText = formatMinOrderSize(p.standardMinOrderSize);
  }

  return { isOffered: false, minimumText, isWalletOnly: false };
}

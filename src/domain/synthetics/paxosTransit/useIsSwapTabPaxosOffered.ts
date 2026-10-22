import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useChainId } from "lib/chains";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";

import { mockTransitApi } from "./mockTransitApi";
import { getPaxosRouteStates } from "./tradeboxRoutes";
import type { TransitApi } from "./types";
import { usePaxosTransitDebugSettings } from "./usePaxosTransitDebugSettings";
import { useTransitMinOrderSizes } from "./useTransitMinOrderSizes";

const FEE_TIER_REFRESH_INTERVAL = 60_000;

export function getTradeboxPaxosFeeTierKey(chainId: number, account: string, isMocked: boolean) {
  return ["tradeboxPaxosFeeTier", chainId, account, isMocked];
}

/**
 * Whether the Swap tab offers a Paxos route for converting this much USDC to USDG, so a hand-off never lands on a
 * tab without one, and from what amount Paxos would take it when it doesn't
 */
export function useIsSwapTabPaxosOffered({
  amount,
  amountUsd,
  isGmxAccount,
  enabled,
}: {
  amount: bigint | undefined;
  amountUsd: bigint | undefined;
  isGmxAccount: boolean;
  enabled: boolean;
}) {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const sdk = useGmxSdk(chainId);
  const { isWhitelistIgnored, isStandardForced, isMocked, thresholdUsdOverride } = usePaxosTransitDebugSettings();
  const api: TransitApi | undefined = isMocked ? mockTransitApi : sdk;
  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  // the Swap tab runs Paxos only from the wallet on the settlement chain
  const isActive =
    enabled &&
    srcChainId === undefined &&
    !isGmxAccount &&
    paxosTransitConfig !== undefined &&
    api !== undefined &&
    account !== undefined;

  const { data: feeTierData, error: feeTierError } = useSWR(
    isActive ? getTradeboxPaxosFeeTierKey(chainId, account!, isMocked) : null,
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

  // until these answer, or when the fee tier fails, the Swap tab's choice is unknown, so callers hold Paxos copy back
  const isResolved =
    isActive &&
    !feeTierError &&
    feeTierData !== undefined &&
    minOrderSizes.standardFee !== undefined &&
    (!isWhitelisted || minOrderSizes.zeroFee !== undefined) &&
    amount !== undefined &&
    amountUsd !== undefined &&
    thresholdUsd !== undefined;

  if (!isResolved) {
    return { isOffered: false, isResolved: false, minimumText: undefined };
  }

  const routeStates = getPaxosRouteStates({
    isWhitelisted,
    isStandardForced,
    isUsdcToUsdg: true,
    amountIn: amount,
    amountInUsd: amountUsd,
    thresholdUsd,
    zeroFeeCapacity: isWhitelisted ? feeTierData.zeroFeeCapacity : undefined,
    zeroFeeMinOrderSize: minOrderSizes.zeroFee,
    standardMinOrderSize: minOrderSizes.standardFee,
  });
  const isOffered = routeStates.paxosZeroFee.status === "quote" || routeStates.paxosStandard.status === "quote";

  if (isOffered) {
    return { isOffered, isResolved, minimumText: undefined };
  }

  const usdc = getToken(chainId, paxosTransitConfig!.usdcAddress);
  const formatMinOrderSize = (minOrderSize: bigint) =>
    formatBalanceAmount(minOrderSize, usdc.decimals, usdc.symbol, { isStable: true });
  const isStandardAlwaysOffered = isWhitelisted || isStandardForced;
  let minimumText: string | undefined;

  if (!isStandardAlwaysOffered && amountUsd < thresholdUsd) {
    minimumText = formatUsd(thresholdUsd, { displayDecimals: 0 });
  } else if (!isStandardAlwaysOffered && amount < minOrderSizes.standardFee!) {
    minimumText = formatMinOrderSize(minOrderSizes.standardFee!);
  } else {
    const minOrderSizesAbove = [routeStates.paxosZeroFee, routeStates.paxosStandard].flatMap((state) =>
      state.status === "belowMinOrderSize" ? [state.minOrderSize] : []
    );

    const smallestMinOrderSize = minOrderSizesAbove.reduce<bigint | undefined>(
      (smallest, size) => (smallest === undefined || size < smallest ? size : smallest),
      undefined
    );

    minimumText = smallestMinOrderSize !== undefined ? formatMinOrderSize(smallestMinOrderSize) : undefined;
  }

  return { isOffered, isResolved, minimumText };
}

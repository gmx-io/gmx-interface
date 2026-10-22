import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";

import { mockTransitApi } from "./mockTransitApi";
import { formatPaxosMinOrderSize, getIsStandardPaxosRouteShown, getPaxosRouteStates } from "./tradeboxRoutes";
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
    enabled && srcChainId === undefined && !isGmxAccount && paxosTransitConfig !== undefined && api !== undefined;

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

  // until the fee tier answers, or when it fails, the Swap tab's choice is unknown, so Paxos copy is held back;
  // a minimum order size that hasn't loaded counts as none, as on the Swap tab
  if (
    !isActive ||
    feeTierError ||
    feeTierData === undefined ||
    amount === undefined ||
    amountUsd === undefined ||
    thresholdUsd === undefined
  ) {
    return { isOffered: false, minimumText: undefined };
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
  // a zero-fee route short on capacity is still offered, with the capacity choice on the Swap tab
  const isOffered =
    routeStates.paxosZeroFee.status === "quote" ||
    routeStates.paxosZeroFee.status === "capacityShort" ||
    routeStates.paxosStandard.status === "quote";

  if (isOffered) {
    return { isOffered, minimumText: undefined };
  }

  const usdc = getToken(chainId, paxosTransitConfig!.usdcAddress);
  const formatMinOrderSize = (minOrderSize: bigint) =>
    `${formatPaxosMinOrderSize(minOrderSize, usdc.decimals)} ${usdc.symbol}`;
  const isStandardShown = getIsStandardPaxosRouteShown({
    isWhitelisted,
    isStandardForced,
    amountInUsd: amountUsd,
    thresholdUsd,
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
    minimumText = formatUsd(thresholdUsd, { displayDecimals: 0 });
  } else if (smallestMinOrderSize !== undefined) {
    minimumText = formatMinOrderSize(smallestMinOrderSize);
  } else if (minOrderSizes.standardFee !== undefined && amount < minOrderSizes.standardFee) {
    // a non-whitelisted standard route under its minimum is hidden rather than shown below it
    minimumText = formatMinOrderSize(minOrderSizes.standardFee);
  }

  return { isOffered, minimumText };
}

import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useChainId } from "lib/chains";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import useWallet from "lib/wallets/useWallet";

import { mockTransitApi } from "./mockTransitApi";
import { getIsStandardPaxosRouteShown } from "./tradeboxRoutes";
import type { TransitApi } from "./types";
import { usePaxosTransitDebugSettings } from "./usePaxosTransitDebugSettings";

const FEE_TIER_REFRESH_INTERVAL = 60_000;

export function getTradeboxPaxosFeeTierKey(chainId: number, account: string, isMocked: boolean) {
  return ["tradeboxPaxosFeeTier", chainId, account, isMocked];
}

/** Whether the Swap tab offers a Paxos route for this amount, so a hand-off never lands on a tab without one */
export function useIsSwapTabPaxosOffered({
  amountUsd,
  isGmxAccount,
  enabled,
}: {
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
  const isPayingFromWallet = srcChainId === undefined && !isGmxAccount;
  const isActive = enabled && isPayingFromWallet && paxosTransitConfig !== undefined && api !== undefined;

  const { data: feeTierData, error: feeTierError } = useSWR(
    isActive && account ? getTradeboxPaxosFeeTierKey(chainId, account, isMocked) : null,
    () => api!.fetchTransitFeeTier({ userAddress: account! }),
    { refreshInterval: FEE_TIER_REFRESH_INTERVAL, onErrorRetry: retryAtRefreshCadence }
  );

  const thresholdUsd = thresholdUsdOverride ?? paxosTransitConfig?.thresholdUsd;
  const isOffered =
    isActive &&
    !feeTierError &&
    feeTierData !== undefined &&
    amountUsd !== undefined &&
    thresholdUsd !== undefined &&
    getIsStandardPaxosRouteShown({
      isWhitelisted: feeTierData.feeTier === "zeroFee" && !isWhitelistIgnored,
      isStandardForced,
      amountInUsd: amountUsd,
      thresholdUsd,
    });

  // until the fee tier answers, or when it fails, the Swap tab's choice is unknown, so callers hold Paxos copy back
  const isResolved = isActive && !feeTierError && feeTierData !== undefined;

  return { isOffered, isResolved, thresholdUsd };
}

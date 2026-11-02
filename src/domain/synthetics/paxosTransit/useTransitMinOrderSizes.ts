import useSWR from "swr";

import type { ContractsChainId } from "sdk/configs/chains";

import type { TransitApi } from "./types";
import { getTransitMinOrderSize } from "./utils";

const ROUTES_REFRESH_INTERVAL = 60_000;

export function useTransitMinOrderSizes({
  api,
  chainId,
  offerAsset,
  wantAsset,
  isActive,
  isZeroFeeEligible,
}: {
  api: TransitApi | undefined;
  chainId: ContractsChainId;
  offerAsset: string | undefined;
  wantAsset: string | undefined;
  isActive: boolean;
  isZeroFeeEligible: boolean;
}) {
  const {
    data: standardFeeRoutes,
    error: standardFeeError,
    isLoading: isStandardFeeLoading,
  } = useSWR(
    isActive ? ["paxosTransitRoutes", chainId, "standardFee"] : null,
    () => api!.fetchTransitRoutes({ feeTier: "standardFee" }),
    { refreshInterval: ROUTES_REFRESH_INTERVAL }
  );

  const {
    data: zeroFeeRoutes,
    error: zeroFeeError,
    isLoading: isZeroFeeLoading,
  } = useSWR(
    isActive && isZeroFeeEligible ? ["paxosTransitRoutes", chainId, "zeroFee"] : null,
    () => api!.fetchTransitRoutes({ feeTier: "zeroFee" }),
    { refreshInterval: ROUTES_REFRESH_INTERVAL }
  );

  const route = { chainId, offerAsset, wantAsset };

  return {
    standardFee: getTransitMinOrderSize(standardFeeRoutes, route),
    zeroFee: getTransitMinOrderSize(zeroFeeRoutes, route),
    // SWR reports retries after an error as loading too, which would flicker a route that treats the error as no minimum
    isLoading:
      (isStandardFeeLoading && standardFeeError === undefined) || (isZeroFeeLoading && zeroFeeError === undefined),
  };
}

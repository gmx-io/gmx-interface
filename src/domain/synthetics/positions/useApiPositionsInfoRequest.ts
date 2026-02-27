import keyBy from "lodash/keyBy";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import type { ContractsChainId } from "sdk/configs/chains";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

type ApiPositionsInfoData = {
  [positionKey: string]: ApiPositionInfo;
};

export function useApiPositionsInfoRequest(
  chainId: ContractsChainId,
  { account, enabled = true }: { account: string | null | undefined; enabled?: boolean }
) {
  const sdk = useGmxSdk(chainId);

  const { data: positionsInfoData, ...rest } = useApiDataRequest<ApiPositionsInfoData>(
    chainId,
    enabled && account && sdk ? ["apiPositionsInfoRequest", chainId, account] : null,
    async () => {
      const positions: ApiPositionInfo[] = await sdk!.fetchPositionsInfo({
        account: account!,
        includeRelatedOrders: false,
      });
      return keyBy(positions, "key");
    },
    FreshnessMetricId.ApiPositionsInfo
  );

  return {
    positionsInfoData,
    ...rest,
  };
}

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import type { ContractsChainId } from "sdk/configs/chains";
import type { RawMarketInfo, RawMarketsInfoData } from "sdk/utils/markets/types";
import { toDict } from "sdk/utils/objects";

export function useApiMarketsInfoRequest(chainId: ContractsChainId, { enabled = true }: { enabled?: boolean } = {}) {
  const sdk = useGmxSdk(chainId);

  const { data: marketsInfoData, ...rest } = useApiDataRequest<RawMarketsInfoData>(
    chainId,
    enabled && sdk ? ["apiMarketsInfoRequest", chainId] : null,
    async () => {
      const marketsInfo: RawMarketInfo[] = await sdk!.fetchMarketsInfo();
      return toDict(marketsInfo, "marketTokenAddress");
    },
    FreshnessMetricId.ApiMarketsInfo
  );

  return {
    marketsInfoData,
    ...rest,
  };
}

import keyBy from "lodash/keyBy";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import type { ContractsChainId } from "sdk/configs/chains";
import type { ApiOrderInfo } from "sdk/utils/orders/types";

type ApiOrdersData = {
  [orderKey: string]: ApiOrderInfo;
};

export function useApiOrdersRequest(
  chainId: ContractsChainId,
  { account, enabled = true }: { account: string | null | undefined; enabled?: boolean }
) {
  const sdk = useGmxSdk(chainId);

  const { data: ordersData, ...rest } = useApiDataRequest<ApiOrdersData>(
    chainId,
    enabled && account && sdk ? ["apiOrdersRequest", chainId, account] : null,
    async () => {
      const orders: ApiOrderInfo[] = await sdk!.fetchOrders({ account: account! });
      return keyBy(orders, "key");
    },
    FreshnessMetricId.ApiOrders
  );

  return {
    ordersData,
    ...rest,
  };
}

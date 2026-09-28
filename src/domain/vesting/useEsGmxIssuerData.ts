import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import { getRewardsVestingConfig } from "config/vesting";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchEsGmxDistributions } from "./esGmxDistributions";

export function useEsGmxIssuerData(chainId: ContractsChainId, account?: string) {
  const config = getRewardsVestingConfig(chainId);
  const issuerConfig = config.type === "ratio" ? config : undefined;
  const enabled = Boolean(issuerConfig && account);
  const history = useSWR(
    enabled ? ["esGmxIssuerDistributions", chainId, issuerConfig!.issuer, account] : null,
    () => fetchEsGmxDistributions(chainId, account!, issuerConfig!),
    { refreshInterval: CONFIG_UPDATE_INTERVAL, keepPreviousData: false }
  );
  const claimable = useMulticall(chainId, "EsGmxIssuer:claimable", {
    key: enabled ? [issuerConfig!.issuer, account] : null,
    keepPreviousData: false,
    request: () => ({
      issuer: {
        contractAddress: issuerConfig!.issuer,
        abiId: "EsGmxIssuer",
        calls: { claimable: { methodName: "claimable", params: [account!] } },
      },
    }),
    parseResponse: (result) => {
      const amount = result.data.issuer.claimable.returnValues[0];
      if (typeof amount !== "bigint") throw new Error("Missing claimable esGMX amount");
      return amount;
    },
  });

  return { issuerConfig, enabled, history, claimable };
}

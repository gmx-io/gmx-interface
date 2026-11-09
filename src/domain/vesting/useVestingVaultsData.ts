import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

import { type OldVestVault, type OrphanVestingData, parseOrphanVestingInfo } from "./vestingVaults";

export type VestingVaultsData = {
  orphan: OrphanVestingData;
  closedOldVaults: Record<OldVestVault, boolean>;
};

const ZEROER_BY_VAULT = {
  gmx: "GmxVesterCapZeroer",
  glp: "GlpVesterCapZeroer",
  affiliate: "ReferralVesterCapZeroer",
} as const;

export function useVestingVaultsData(chainId: ContractsChainId, account: string | undefined) {
  const orphanVesterAddress = getContract(chainId, "OrphanRatioVester");

  const { data } = useMulticall<MulticallRequestConfig<any>, VestingVaultsData>(chainId, "useVestingVaultsData", {
    key: orphanVesterAddress !== zeroAddress && account ? [account] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: (requestChainId) => {
      const zeroerCalls = Object.fromEntries(
        Object.entries(ZEROER_BY_VAULT).map(([vault, zeroer]) => [
          vault,
          {
            contractAddress: getContract(requestChainId, zeroer),
            abiId: "VesterCapZeroer",
            calls: { isZeroed: { methodName: "isZeroed", params: [account] } },
          },
        ])
      );

      return {
        reader: {
          contractAddress: getContract(requestChainId, "RatioVesterReader"),
          abiId: "RatioVesterReader",
          calls: {
            vestingInfo: { methodName: "getVestingInfo", params: [[orphanVesterAddress], account] },
            tranches: { methodName: "getTranches", params: [orphanVesterAddress, account] },
          },
        },
        ...zeroerCalls,
      } satisfies MulticallRequestConfig<any>;
    },
    parseResponse: parseVestingVaultsResponse,
  });

  return data;
}

function parseVestingVaultsResponse(result: MulticallResult<MulticallRequestConfig<any>>): VestingVaultsData {
  const reader = result.data.reader;

  return {
    orphan: parseOrphanVestingInfo({
      vestingInfo: reader.vestingInfo.returnValues as bigint[],
      trancheStartTimes: reader.tranches.returnValues[0] as bigint[],
    }),
    closedOldVaults: {
      gmx: result.data.gmx.isZeroed.returnValues[0],
      glp: result.data.glp.isZeroed.returnValues[0],
      affiliate: result.data.affiliate.isZeroed.returnValues[0],
    },
  };
}

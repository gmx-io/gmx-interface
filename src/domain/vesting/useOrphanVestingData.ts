import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

import { type OrphanVestingData, parseOrphanVestingInfo } from "./vestingVaults";

export function useOrphanVestingData(chainId: ContractsChainId, account: string | undefined) {
  const orphanVesterAddress = getContract(chainId, "OrphanRatioVester");

  const { data } = useMulticall<MulticallRequestConfig<any>, OrphanVestingData>(chainId, "useOrphanVestingData", {
    key: orphanVesterAddress !== zeroAddress && account ? [account] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: (requestChainId) => ({
      reader: {
        contractAddress: getContract(requestChainId, "RatioVesterReader"),
        abiId: "RatioVesterReader",
        calls: {
          vestingInfo: { methodName: "getVestingInfo", params: [[orphanVesterAddress], account] },
          tranches: { methodName: "getTranches", params: [orphanVesterAddress, account] },
        },
      },
    }),
    parseResponse: parseOrphanVestingResponse,
  });

  return data;
}

function parseOrphanVestingResponse(result: MulticallResult<MulticallRequestConfig<any>>): OrphanVestingData {
  const reader = result.data.reader;

  return parseOrphanVestingInfo({
    vestingInfo: reader.vestingInfo.returnValues as bigint[],
    trancheStartTimes: reader.tranches.returnValues[0] as bigint[],
  });
}

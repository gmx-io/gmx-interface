import Multicall from "sdk/abis/Multicall.json";
import { getContract } from "config/contracts";
import { useMemo } from "react";
import { useMulticall } from "./multicall";
import { FREQUENT_UPDATE_INTERVAL } from "./timeConstants";
import { getIsFlagEnabled } from "config/ab";

export type BlockTimestampData = {
  blockTimestamp: bigint;
  localTimestamp: bigint;
};

export type BlockTimestampResult = {
  blockTimestampData?: BlockTimestampData;
};

export function useBlockTimestamp(chainId: number, { skip }: { skip?: boolean } = {}): BlockTimestampResult {
  const { data } = useMulticall(chainId, "useBlockTimestamp", {
    key: !skip ? [] : null,

    refreshInterval: FREQUENT_UPDATE_INTERVAL,

    request: () => ({
      multicall: {
        contractAddress: getContract(chainId, "Multicall"),
        abi: Multicall.abi,
        calls: {
          getCurrentBlockTimestamp: {
            methodName: "getCurrentBlockTimestamp",
            params: [],
          },
        },
      },
    }),

    parseResponse: (res) => {
      const blockTimestamp = res.data.multicall.getCurrentBlockTimestamp.returnValues[0];

      return {
        blockTimestamp: blockTimestamp,
        localTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      };
    },
  });

  return useMemo(() => ({ blockTimestampData: getIsFlagEnabled("testBlockTimestampHook") ? data : undefined }), [data]);
}

export function adjustBlockTimestamp(blockTimestampData: BlockTimestampData) {
  const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));

  return blockTimestampData.blockTimestamp + (nowInSeconds - blockTimestampData.localTimestamp);
}

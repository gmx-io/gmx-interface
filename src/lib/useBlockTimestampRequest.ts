import { useMemo } from "react";

import { getContract } from "config/contracts";

import { useMulticall } from "./multicall";
import { FREQUENT_UPDATE_INTERVAL } from "./timeConstants";

export type BlockTimestampData = {
  blockTimestamp: bigint;
  localTimestamp: bigint;
};

export type BlockTimestampResult = {
  blockTimestampData?: BlockTimestampData;
};

export function useBlockTimestampRequest(chainId: number, { skip }: { skip?: boolean } = {}): BlockTimestampResult {
  const { data } = useMulticall(chainId, "useBlockTimestamp", {
    key: !skip ? [] : null,

    refreshInterval: FREQUENT_UPDATE_INTERVAL,

    request: () => ({
      multicall: {
        contractAddress: getContract(chainId, "Multicall"),
        abiId: "Multicall",
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

  return useMemo(() => ({ blockTimestampData: data }), [data]);
}

export function adjustBlockTimestamp(blockTimestampData: BlockTimestampData) {
  const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));

  return blockTimestampData.blockTimestamp + (nowInSeconds - blockTimestampData.localTimestamp);
}

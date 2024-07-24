import { gql } from "@apollo/client";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxToTokenAddress } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useEffect, useState, useCallback } from "react";

export function use24hVolume() {
  const chainId = useSelector(selectChainId);
  const indexTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const client = getSyntheticsGraphClient(chainId);

  const [value, setValue] = useState<bigint>(0n);

  const fetch = useCallback(
    async function call() {
      if (!client || !indexTokenAddress) {
        return 0;
      }

      const query = gql(`
{
  positionVolumeInfos(
    orderBy: timestamp
    orderDirection: desc
    where: {
      period: "1d",
      indexToken: "${indexTokenAddress.toLocaleLowerCase()}",
      timestamp_gt: ${((Date.now() - 24 * 60 * 60 * 1000) / 1000) >> 0}
    }
  ) {
    id
    volumeUsd
    timestamp
    __typename
  }
}`);

      const { data } = await client.query<{
        positionVolumeInfos: {
          volumeUsd: number;
        }[];
      }>({ query, fetchPolicy: "no-cache" });

      const result = data.positionVolumeInfos.reduce((acc, { volumeUsd }) => acc + BigInt(volumeUsd), 0n);

      setValue(result);
    },
    [client, indexTokenAddress]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return value;
}

import { gql } from "@apollo/client";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useCallback, useEffect, useState } from "react";

export function use24hVolume() {
  const chainId = useSelector(selectChainId);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const client = getSyntheticsGraphClient(chainId);

  const [value, setValue] = useState<bigint>(0n);

  const fetch = useCallback(
    async function call() {
      if (!client || !marketInfo?.indexTokenAddress) {
        return 0;
      }

      const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
      const utcOffsetSecs = new Date().getTimezoneOffset() * 60;
      const timestamp = LAST_DAY_UNIX_TIMESTAMP + utcOffsetSecs;

      const query = gql(`{
  positionVolumeInfos(
    orderBy: timestamp
    orderDirection: desc
    where: {
      period: "1d",
      indexToken: "${marketInfo.indexTokenAddress.toLocaleLowerCase()}",
      timestamp_gt: ${timestamp}
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
    [client, marketInfo?.indexTokenAddress]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return value;
}

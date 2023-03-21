import { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { getGmxGraphClient } from "lib/subgraph/clients";
import { bigNumberify } from "lib/numbers";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { BigNumber } from "ethers";
import { VolumeInfo, VolumeStat } from "./types";

export function useVolumeInfo() {
  const [volumeInfo, setVolumeInfo] = useState<null | VolumeInfo>(null);
  useEffect(() => {
    const _volumeInfo: VolumeInfo = {
      totalVolume: bigNumberify(0) as BigNumber,
      [AVALANCHE]: { totalVolume: bigNumberify(0) as BigNumber },
      [ARBITRUM]: { totalVolume: bigNumberify(0) as BigNumber },
    };

    Promise.all(
      [ARBITRUM, AVALANCHE].map(async (chainId) => {
        const client = getGmxGraphClient(chainId);
        const query = gql`
          {
            volumeStats(
              orderBy: ${chainId === ARBITRUM ? "id" : "timestamp"},
              orderDirection: desc,
              first: 24
              where: { period: hourly }
            ) {
              swap
              margin
              liquidation
              mint
              burn
            }
          }
        `;
        const res = await client!.query({ query });

        const volume = res.data.volumeStats.reduce((acc: BigNumber, item: VolumeStat) => {
          return acc.add(item.swap).add(item.margin).add(item.liquidation).add(item.mint).add(item.burn);
        }, bigNumberify(0));

        _volumeInfo[chainId] = { totalVolume: volume };
        _volumeInfo.totalVolume = _volumeInfo.totalVolume.add(volume);
      })
    ).then(() => {
      setVolumeInfo(_volumeInfo);
    });
  }, []);

  return volumeInfo;
}

import useSWR from "swr";

import { GMX_STATS_API_URL } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { bigNumberify } from "lib/numbers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

const URL = `${GMX_STATS_API_URL}/volume/24h`;

export function useVolumeInfo() {
  const { data } = useSWR(
    URL,
    async (url) => {
      const res = await fetch(url);
      const json = await res.json();
      return {
        [ARBITRUM]: bigNumberify(json[ARBITRUM]),
        [AVALANCHE]: bigNumberify(json[AVALANCHE]),
        total: bigNumberify(json.total),
      };
    },
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return data;
}

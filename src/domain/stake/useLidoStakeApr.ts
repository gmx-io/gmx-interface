import useSWR from "swr";

import { LIDO_STAKE_APR_URL } from "config/lido";
import { expandDecimals } from "lib/numbers";

export const LIDO_APR_DECIMALS = 28;
export const LIDO_APR_DIVISOR = expandDecimals(1, LIDO_APR_DECIMALS);

export function useLidoStakeApr() {
  const { data: lidoApr } = useSWR(["lido-stake-apr"], {
    fetcher: async () => {
      const lidoResponse = await fetch(LIDO_STAKE_APR_URL).then((res) => res.json());

      if (!lidoResponse?.data.smaApr) {
        return undefined;
      }

      return BigInt(Math.ceil(lidoResponse.data.smaApr * Number(LIDO_APR_DIVISOR)));
    },
  });

  return lidoApr;
}

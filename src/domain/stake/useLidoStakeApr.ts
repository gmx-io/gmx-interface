import useSWR from "swr";
import { expandDecimals } from "lib/numbers";

const LIDO_STAKE_APR_URL = "https://eth-api.lido.fi/v1/protocol/steth/apr/sma";

export const LIDO_APR_DECIMALS = 28;
export const LIDO_APR_DIVISOR = expandDecimals(1, LIDO_APR_DECIMALS);

export function useLidoStakeApr() {
  const { data: lidoAprResult } = useSWR(["lido-stake-apr"], {
    fetcher: () => fetch(LIDO_STAKE_APR_URL).then((res) => res.json()),
  });

  if (!lidoAprResult?.data.smaApr) {
    return undefined;
  }

  return BigInt(Math.ceil(lidoAprResult.data.smaApr * Number(LIDO_APR_DIVISOR)));
}

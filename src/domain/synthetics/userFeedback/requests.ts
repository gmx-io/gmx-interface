import { USD_DECIMALS } from "config/factors";
import { formatAmountForMetrics, metrics, MissedCoinEvent } from "lib/metrics";
import debounce from "lodash/debounce";
import { MissedCoinsPlace } from "./types";
import { COIN_REGEXP } from "./utils";

export function sendMissedCoinsFeedback({
  totalVolume,
  monthVolume,
  coins,
  place,
}: {
  totalVolume: bigint | undefined;
  monthVolume: bigint | undefined;
  place: MissedCoinsPlace;
  coins: string[];
}) {
  coins.forEach((coin) => {
    metrics.pushEvent<MissedCoinEvent>({
      event: "missedCoin.popup",
      isError: false,
      data: {
        coin,
        totalVolume: formatAmountForMetrics(totalVolume ? totalVolume : 0n, USD_DECIMALS, "toInt"),
        monthVolume: formatAmountForMetrics(monthVolume ? monthVolume : 0n, USD_DECIMALS, "toInt"),
        place,
      },
    });
  });
}

export const sendMissedCoinSearchDebounced = debounce(
  ({
    searchText,
    totalVolume,
    monthVolume,
    place,
  }: {
    searchText: string;
    totalVolume: bigint | undefined;
    monthVolume: bigint | undefined;
    place: MissedCoinsPlace;
    account?: string;
  }) => {
    const coin = searchText.trim().toUpperCase();

    if (coin.length === 0 || coin.length > 10 || !coin.match(COIN_REGEXP)) {
      return;
    }

    metrics.pushEvent<MissedCoinEvent>({
      event: "missedCoin.search",
      isError: false,
      data: {
        coin,
        totalVolume: formatAmountForMetrics(totalVolume ? totalVolume : 0n, USD_DECIMALS, "toInt"),
        monthVolume: formatAmountForMetrics(monthVolume ? monthVolume : 0n, USD_DECIMALS, "toInt"),
        place,
      },
    });
  },
  500
);

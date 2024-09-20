import { formatAmountForMetrics, metrics, MissedCoinEvent } from "lib/metrics";
import { MissedCoinsPlace } from "./types";
import debounce from "lodash/debounce";
import { USD_DECIMALS } from "config/factors";

export function sendMissedCoinsFeedback({
  totalVolume,
  monthVolume,
  coinsInput,
  place,
}: {
  totalVolume: bigint | undefined;
  monthVolume: bigint | undefined;
  place: MissedCoinsPlace;
  coinsInput: string;
}) {
  const coins = coinsInput.trim().toUpperCase().split(/,|\W/);

  coins.forEach((coin) => {
    if (coin.length === 0) {
      return;
    }

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

    if (coin.length === 0) {
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
  400
);

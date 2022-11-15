import { getServerUrl } from "config/backend";
import { BigNumber } from "ethers";
import { bigNumberify } from "lib/numbers";
import useSWR from "swr";

export function usePriceImpact(
  chainId: number,
  p: { market: string; shortDeltaUsd?: BigNumber; longDeltaUsd?: BigNumber }
) {
  // TODO: Synthetics API
  const statsApiUrl = getServerUrl(chainId, "/position_stats");

  const { data: positionStats } = useSWR([statsApiUrl], {
    // @ts-ignore
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  if (!positionStats) {
    return undefined;
  }

  const longInterest: BigNumber = positionStats.totalLongPositionSizes || bigNumberify(0)!;
  const shortInterest: BigNumber = positionStats.totalShortPositionSizes || bigNumberify(0)!;

  const currentPriceImpact = longInterest.sub(shortInterest).abs();

  let newLongInterest = longInterest.add(p.longDeltaUsd || bigNumberify(0)!);
  let newShortInterest = shortInterest.add(p.shortDeltaUsd || bigNumberify(0)!);

  const newPriceImpact = newLongInterest.sub(newShortInterest).abs();

  const priceImpactDiff = currentPriceImpact.sub(newPriceImpact);

  const totalTradeSize = bigNumberify(0)!
    .add(p.longDeltaUsd || bigNumberify(0)!)
    .add(p.shortDeltaUsd || bigNumberify(0)!);

  const priceImpactShare = priceImpactDiff.div(totalTradeSize);

  return {
    priceImpactDiff,
    priceImpactShare,
  };
}

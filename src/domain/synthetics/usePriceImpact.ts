import { getServerUrl } from "config/backend";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "lib/legacy";
import { bigNumberify, formatAmount, formatAmountFree } from "lib/numbers";
import useSWR from "swr";

const EXPONENT_FACTOR = 2;
const FACTOR = 1000000;

const WEI_PRECISION = 10 ** 18;
const FLOAT_TO_WEI_DIVISOR = 10 ** 12;

const FLOAT_PRECISION = 10 ** 2;

function floatToWei(amount: BigNumber): BigNumber {
  return amount.div(FLOAT_TO_WEI_DIVISOR);
}

function weiToFloat(amount: BigNumber): BigNumber {
  return amount.mul(FLOAT_TO_WEI_DIVISOR);
}

function applyImpactFactor(diff: BigNumber) {
  const exp = floatToWei(diff).pow(floatToWei(bigNumberify(EXPONENT_FACTOR)!.div(BASIS_POINTS_DIVISOR)));
  return diff;

  // return diff
  //   .div(10 * 60)
  //   .pow(EXPONENT_FACTOR)
  //   .div(FACTOR)
  //   .div(2);
}
//
// current = longs - shorts
// new = (longs + longsDelta) - (shorts + shortsDelta)
// diff = (new - current) = (longs + longsDelta) - (shorts + shortsDelta) =
// longs + longsDelta - shorts -  shortsDelta = longs - shorts
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

  const longInterest: BigNumber = bigNumberify(positionStats?.totalLongPositionSizes) || bigNumberify(0)!;
  const shortInterest: BigNumber = bigNumberify(positionStats?.totalShortPositionSizes) || bigNumberify(0)!;

  console.log(
    positionStats,
    Number(longInterest),
    Number(shortInterest),
    formatAmount(longInterest, USD_DECIMALS, 3, true),
    formatAmount(shortInterest, USD_DECIMALS, 3, true)
  );

  const currentPriceImpact = applyImpactFactor(longInterest.sub(shortInterest).abs());

  console.log("currentPriceImpact", formatAmount(currentPriceImpact, USD_DECIMALS, 3, true));

  let newLongInterest = longInterest.add(p.longDeltaUsd || bigNumberify(0)!);
  let newShortInterest = shortInterest.add(p.shortDeltaUsd || bigNumberify(0)!);

  const newPriceImpact = applyImpactFactor(newLongInterest.sub(newShortInterest).abs());

  console.log("newPriceImpact", formatAmount(newPriceImpact, USD_DECIMALS, 3, true));

  const priceImpactDiff = currentPriceImpact.sub(newPriceImpact);

  console.log("priceImpactDiff", formatAmount(priceImpactDiff, USD_DECIMALS, 3, true));

  const totalTradeSize = bigNumberify(0)!
    .add(p.longDeltaUsd || bigNumberify(0)!)
    .add(p.shortDeltaUsd || bigNumberify(0)!);

  const priceImpactShare = priceImpactDiff.div(totalTradeSize.gt(0) ? totalTradeSize : bigNumberify(1)!);

  return {
    priceImpactDiff,
    priceImpactShare,
  };
}

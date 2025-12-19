import { GmPaySource, Market } from "domain/synthetics/markets/types";

import { Mode, Operation } from "./types";

export function getGmSwapBoxAvailableModes({
  operation,
  market,
  areBothCollateralsCrossChain = true,
  paySource,
}: {
  operation: Operation;
  market: Pick<Market, "isSameCollaterals"> | undefined;
  paySource: GmPaySource;
  areBothCollateralsCrossChain?: boolean;
}) {
  if ((market && market.isSameCollaterals) || operation === Operation.Shift) {
    return [Mode.Single];
  }

  if (paySource === "sourceChain" && !areBothCollateralsCrossChain) {
    return [Mode.Single];
  }

  return [Mode.Single, Mode.Pair];
}

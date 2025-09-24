import { Market } from "domain/synthetics/markets/types";

import { Mode, Operation } from "./types";

export const getGmSwapBoxAvailableModes = (
  operation: Operation,
  market: Pick<Market, "isSameCollaterals"> | undefined
) => {
  if ((market && market.isSameCollaterals) || operation === Operation.Shift) {
    return [Mode.Single];
  }

  if (operation === Operation.Deposit) {
    return [Mode.Single, Mode.Pair];
  }

  return [Mode.Pair];
};

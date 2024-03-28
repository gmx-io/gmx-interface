import { Market } from "domain/synthetics/markets/types";
import { Mode, Operation } from "./GmSwapBox";

export const getGmSwapBoxAvailableModes = (operation: Operation, market?: Pick<Market, "isSameCollaterals">) => {
  if (operation === Operation.Deposit) {
    if (!market?.isSameCollaterals) {
      return [Mode.Single, Mode.Pair];
    }

    return [Mode.Single];
  }

  if (market?.isSameCollaterals) {
    return [Mode.Single];
  }

  return [Mode.Pair];
};

import { GmPaySource, Market, Mode, Operation } from "domain/synthetics/markets/types";

export function getGmSwapBoxAvailableModes({
  operation,
  market,
  areBothCollateralsCrossChain = true,
  paySource,
  isWithdrawalSwapEnabled = true,
}: {
  operation: Operation;
  market: Pick<Market, "isSameCollaterals"> | undefined;
  paySource: GmPaySource;
  areBothCollateralsCrossChain?: boolean;
  isWithdrawalSwapEnabled?: boolean;
}) {
  if ((market && market.isSameCollaterals) || operation === Operation.Shift) {
    return [Mode.Single];
  }

  if (operation === Operation.Withdrawal && !isWithdrawalSwapEnabled) {
    return [Mode.Pair];
  }

  if (paySource === "sourceChain" && !areBothCollateralsCrossChain) {
    return [Mode.Single];
  }

  return [Mode.Single, Mode.Pair];
}

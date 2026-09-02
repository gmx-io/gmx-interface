import { GlvOrMarketInfo, Operation } from "domain/synthetics/markets/types";
import { getGlvOrMarketAddress } from "domain/synthetics/markets/utils";

export function getGmSwapBoxAvailableOperations({
  shiftAvailableMarkets,
  selectedGlvOrMarketAddress,
}: {
  shiftAvailableMarkets: GlvOrMarketInfo[];
  selectedGlvOrMarketAddress: string | undefined;
}): Operation[] {
  if (shiftAvailableMarkets.length === 0) {
    return [Operation.Deposit, Operation.Withdrawal];
  }

  const isSelectedMarketShiftAvailable = Boolean(
    shiftAvailableMarkets.find((market) => getGlvOrMarketAddress(market) === selectedGlvOrMarketAddress)
  );

  if (!isSelectedMarketShiftAvailable) {
    return [Operation.Deposit, Operation.Withdrawal];
  }

  return [Operation.Deposit, Operation.Withdrawal, Operation.Shift];
}

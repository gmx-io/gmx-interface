import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";
import { applyFactor } from "lib/numbers";
import { FeeItem } from "../types";

export function getUiFee(sizeUsd?: BigNumber, feeFactor?: BigNumber): FeeItem | undefined {
  if (!sizeUsd || !feeFactor || sizeUsd?.eq(0) || feeFactor?.eq(0)) {
    return;
  }

  const decimals = 6;
  const feeUsd = applyFactor(sizeUsd.mul(-1), feeFactor);
  const factor = feeFactor.mul(Math.pow(10, decimals)).div(PRECISION);
  return {
    deltaUsd: feeUsd,
    bps: factor,
  };
}

import { BigNumber } from "ethers";
import { PRECISION } from "lib/legacy";

export function getIncreaseOrderFees() {}

export function getDecreaseOrderFees() {}

export function getSwapFees(amountIn: BigNumber, swapFeeFactor: BigNumber) {
  const feeAmount = amountIn.mul(swapFeeFactor).div(PRECISION);
  const amountAfterFees = amountIn.sub(feeAmount);

  return {
    feeAmount: feeAmount,
    amountAfterFees: amountAfterFees,
  };
}

export function getSwapOrderFee() {}

export function getDepositFees(depositAmount: BigNumber, swapFeeFactor: BigNumber) {
  return getSwapFees(depositAmount, swapFeeFactor);
}

export function getWithdrawalFees(
  longTokenOutAmount: BigNumber,
  shortTokenOutAmount: BigNumber,
  marketFeeFactor: BigNumber
) {
  const longFees = getSwapFees(longTokenOutAmount, marketFeeFactor);
  const shortFees = getSwapFees(shortTokenOutAmount, marketFeeFactor);

  return {
    longFees,
    shortFees,
  };
}

import { BigNumber } from "ethers";

export function shouldShowMaxButton(tokenState: { balance?: BigNumber; tokenAmount: BigNumber }) {
  return tokenState.balance?.gt(0) && !tokenState.tokenAmount.eq(tokenState.balance);
}

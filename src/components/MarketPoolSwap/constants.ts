import { MarketPoolType } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";

export enum Operation {
  deposit = "deposit",
  withdraw = "withdraw",
}

export enum Mode {
  single = "single",
  pair = "pair",
}

export enum FocusInputId {
  swapFirst = "swapFirst",
  swapSecond = "swapSecod",
  market = "market",
}

export const operationTexts = {
  [Operation.deposit]: t`Deposit`,
  [Operation.withdraw]: t`Withdraw`,
};

export const modeTexts = {
  [Mode.single]: t`Single`,
  [Mode.pair]: t`Pair`,
};

export type PoolDelta = {
  tokenAddress: string;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  usdDelta: BigNumber;
  poolType: MarketPoolType;
};

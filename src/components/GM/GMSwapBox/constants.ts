import { t } from "@lingui/macro";

export enum OperationType {
  deposit = "deposit",
  withdraw = "withdraw",
}

export enum Mode {
  single = "single",
  pair = "pair",
}

export const operationTypesTexts = {
  [OperationType.deposit]: t`Deposit`,
  [OperationType.withdraw]: t`Withdraw`,
};

export const modesTexts = {
  [Mode.single]: t`Single`,
  [Mode.pair]: t`Pair`,
};

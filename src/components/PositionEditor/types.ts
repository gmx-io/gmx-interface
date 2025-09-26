import { msg } from "@lingui/macro";

export enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

export const OPERATION_LABELS = {
  [Operation.Deposit]: msg`Deposit`,
  [Operation.Withdraw]: msg`Withdraw`,
};

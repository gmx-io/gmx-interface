import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

import type { PositionEditorDepositMode } from "domain/synthetics/trade/usePositionEditorState";

export enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

export const OPERATION_LABELS = {
  [Operation.Deposit]: msg`Deposit`,
  [Operation.Withdraw]: msg`Withdraw`,
};

export const DEPOSIT_MODES: PositionEditorDepositMode[] = ["now", "atPrice"];

export const DEPOSIT_MODE_LABELS: Record<PositionEditorDepositMode, MessageDescriptor> = {
  now: msg`Now`,
  atPrice: msg`At price`,
};

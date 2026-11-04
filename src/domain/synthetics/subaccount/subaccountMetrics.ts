import {
  metrics,
  type SubaccountActivationEvent,
  type SubaccountRemovalEvent,
  type SubaccountSettingsUpdateEvent,
} from "lib/metrics";
import { getTxnErrorOutcome } from "lib/metrics/txnErrorOutcome";

import { SubaccountRemovalResultUnknownError } from "./errors";

export function sendSubaccountActivationMetric({
  failedStep,
  isNewKey,
  isGmxAccount,
  chainId,
  error,
}: {
  failedStep?: NonNullable<SubaccountActivationEvent["data"]["failedStep"]>;
  isNewKey: boolean;
  isGmxAccount: boolean;
  chainId: number;
  error?: unknown;
}) {
  metrics.pushEvent<SubaccountActivationEvent>({
    event: "subaccount.activation",
    isError: false,
    data: {
      outcome: failedStep === undefined ? "activated" : getTxnErrorOutcome(error),
      failedStep,
      isNewKey,
      isGmxAccount,
      chainId,
    },
  });
}

export function sendSubaccountSettingsUpdateMetric({
  wasExpired,
  wasActionsExceeded,
  isGmxAccount,
  chainId,
  error,
}: {
  wasExpired: boolean;
  wasActionsExceeded: boolean;
  isGmxAccount: boolean;
  chainId: number;
  error?: unknown;
}) {
  metrics.pushEvent<SubaccountSettingsUpdateEvent>({
    event: "subaccount.settingsUpdate",
    isError: false,
    data: {
      outcome: error === undefined ? "updated" : getTxnErrorOutcome(error),
      wasExpired,
      wasActionsExceeded,
      isGmxAccount,
      chainId,
    },
  });
}

export function sendSubaccountRemovalMetric({
  method,
  chainId,
  error,
}: {
  method: SubaccountRemovalEvent["data"]["method"];
  chainId: number;
  error?: unknown;
}) {
  metrics.pushEvent<SubaccountRemovalEvent>({
    event: "subaccount.removal",
    isError: false,
    data: {
      method,
      outcome: getRemovalOutcome(error),
      chainId,
    },
  });
}

function getRemovalOutcome(error: unknown): SubaccountRemovalEvent["data"]["outcome"] {
  if (error === undefined) {
    return "removed";
  }

  return error instanceof SubaccountRemovalResultUnknownError ? "unknown" : getTxnErrorOutcome(error);
}

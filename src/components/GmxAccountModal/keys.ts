import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

export const FUNDING_OPERATIONS_LABELS = {
  deposit: msg`Deposit`,
  "deposit-failed": msg`Deposit failed`,
  withdrawal: msg`Withdrawal`,
  "withdrawal-failed": msg`Withdrawal failed`,
} satisfies Partial<Record<`${"deposit" | "withdrawal"}${"" | "-failed"}`, MessageDescriptor>>;

import type { Locator } from "@playwright/test";
import { getAddress } from "viem";

import { getToken } from "../../../sdk/src/configs/tokens";
import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import type { FundingTransfer } from "./liveAccounts";
import { transferListDate } from "./utcDates";

type Transfer = Pick<FundingTransfer, "settlementChainId" | "operation" | "sentAmount" | "sentTimestamp"> & {
  token: string;
  isExecutionError: boolean | null;
};

// Rows carry no id, so a transfer is matched by its token, label, signed amount and list date.
export function transferRow(modal: Locator, transfer: Transfer) {
  const page = modal.page();
  const token = getToken(transfer.settlementChainId, getAddress(transfer.token));
  const isDeposit = transfer.operation === "deposit";
  const label = `${isDeposit ? "Deposit" : "Withdrawal"}${transfer.isExecutionError ? " failed" : ""}`;
  const sent = BigInt(transfer.sentAmount);
  const amount = formatBalanceAmount(isDeposit ? sent : -sent, token.decimals, undefined, {
    isStable: token.isStable,
    signed: true,
  });
  const row = modal
    .getByRole("button")
    .filter({ has: page.getByText(token.symbol, { exact: true }) })
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByText(amount, { exact: true }) })
    .filter({ has: page.getByText(transferListDate(transfer.sentTimestamp), { exact: true }) });
  return { row, token, label, sent, isDeposit };
}

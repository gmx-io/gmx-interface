import type { TransferRequests } from "domain/multichain/types";

export function getTransferRequests(
  transfers: {
    to: string;
    token: string | undefined;
    amount: bigint | undefined;
  }[]
): TransferRequests | undefined {
  if (transfers.length === 0) {
    return undefined;
  }

  const requests: TransferRequests = {
    tokens: [],
    receivers: [],
    amounts: [],
  };

  let allZero = true;

  for (const transfer of transfers) {
    if (!transfer.token || transfer.amount === undefined || transfer.amount <= 0n) {
      continue;
    }

    allZero = false;
    requests.tokens.push(transfer.token);
    requests.receivers.push(transfer.to);
    requests.amounts.push(transfer.amount);
  }

  if (allZero) {
    return undefined;
  }

  return requests;
}

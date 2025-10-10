import type { TransferRequests } from "domain/multichain/types";

export function getTransferRequests(
  transfers: {
    to: string;
    token: string | undefined;
    amount: bigint | undefined;
  }[]
): TransferRequests {
  const requests: TransferRequests = {
    tokens: [],
    receivers: [],
    amounts: [],
  };

  for (const transfer of transfers) {
    if (!transfer.token || transfer.amount === undefined || transfer.amount <= 0n) {
      continue;
    }

    requests.tokens.push(transfer.token);
    requests.receivers.push(transfer.to);
    requests.amounts.push(transfer.amount);
  }

  return requests;
}

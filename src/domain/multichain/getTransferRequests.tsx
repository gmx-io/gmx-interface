import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

export function getTransferRequests(
  transfers: {
    to: string;
    token: string | undefined;
    amount: bigint | undefined;
  }[]
): IRelayUtils.TransferRequestsStruct {
  const requests: IRelayUtils.TransferRequestsStruct = {
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

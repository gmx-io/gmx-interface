import type { ContractsChainId } from "config/chains";
import type { TransferRequests } from "domain/multichain/types";
import { isContractsV2_2_1 } from "sdk/configs/contracts";

const TRANSFER_REQUESTS_TYPES = {
  TransferRequests: [
    { name: "tokens", type: "address[]" },
    { name: "receivers", type: "address[]" },
    { name: "amounts", type: "uint256[]" },
  ],
};

export function getTransferRequestsTypedDataParts({
  chainId,
  account,
  transferRequests,
}: {
  chainId: ContractsChainId;
  account: string;
  transferRequests: TransferRequests;
}) {
  if (isContractsV2_2_1(chainId)) {
    return {
      fields: [
        { name: "account", type: "address" },
        { name: "transferRequests", type: "TransferRequests" },
      ],
      types: TRANSFER_REQUESTS_TYPES,
      message: { account, transferRequests },
    };
  }

  return {
    fields: [
      { name: "transferTokens", type: "address[]" },
      { name: "transferReceivers", type: "address[]" },
      { name: "transferAmounts", type: "uint256[]" },
    ],
    types: {},
    message: {
      transferTokens: transferRequests.tokens,
      transferReceivers: transferRequests.receivers,
      transferAmounts: transferRequests.amounts,
    },
  };
}

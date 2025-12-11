import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import type { TransferRequests } from "domain/multichain/types";

export function buildWithdrawalTransferRequests({
  isWithdrawal,
  isGlv,
  chainId,
  glvTokenAddress,
  glvTokenAmount,
  marketTokenAddress,
  marketTokenAmount,
}: {
  isWithdrawal: boolean;
  isGlv: boolean;
  chainId: ContractsChainId;
  glvTokenAddress: string | undefined;
  glvTokenAmount: bigint;
  marketTokenAddress: string | undefined;
  marketTokenAmount: bigint;
}): TransferRequests | undefined {
  if (!isWithdrawal) {
    return undefined;
  }

  if (isGlv) {
    if (!glvTokenAddress) {
      return undefined;
    }
    return getTransferRequests([
      {
        to: getContract(chainId, "GlvVault"),
        token: glvTokenAddress,
        amount: glvTokenAmount,
      },
    ]);
  }

  if (!marketTokenAddress) {
    return undefined;
  }

  return getTransferRequests([
    {
      to: getContract(chainId, "WithdrawalVault"),
      token: marketTokenAddress,
      amount: marketTokenAmount,
    },
  ]);
}

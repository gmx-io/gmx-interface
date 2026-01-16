import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import type { TransferRequests } from "domain/multichain/types";
import type { ContractName } from "sdk/configs/contracts";

export function buildWithdrawalTransferRequests({
  isWithdrawal,
  isGlv,
  chainId,
  glvOrMarketTokenAddress,
  glvOrMarketAmount,
}: {
  isWithdrawal: boolean;
  isGlv: boolean;
  chainId: ContractsChainId;
  glvOrMarketTokenAddress: string | undefined;
  glvOrMarketAmount: bigint;
}): TransferRequests | undefined {
  if (!isWithdrawal) {
    return undefined;
  }

  if (!glvOrMarketTokenAddress) {
    return undefined;
  }

  const vaultContract: ContractName = isGlv ? "GlvVault" : "WithdrawalVault";

  return getTransferRequests([
    {
      to: getContract(chainId, vaultContract),
      token: glvOrMarketTokenAddress,
      amount: glvOrMarketAmount,
    },
  ]);
}
